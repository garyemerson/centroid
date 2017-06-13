extern crate env_logger;
#[macro_use]
extern crate log;
#[macro_use]
extern crate neon;
extern crate rand;

use neon::js::{JsNull, JsString, JsNumber, JsArray, JsBoolean};
use neon::vm::{Call, JsResult};
use std::thread;
use rand::os::OsRng;
use rand::Rng;

// Initialize this extension.
fn init(_call: Call) -> JsResult<JsNull> {
    env_logger::init().expect("could not initialize env_logger");
    Ok(JsNull::new())
}

fn hello(call: Call) -> JsResult<JsString> {
    let child = thread::spawn(move || {
        let mut r = OsRng::new().unwrap();
        r.next_u32()
    });
    let res = child.join();

    let scope = call.scope;
    Ok(JsString::new(scope, &format!("Rust randomly generated {}", res.unwrap())).unwrap())
}

fn get_max(call: Call) -> JsResult<JsNumber> {
    let nums = call.arguments.require(call.scope, 0)?
        .check::<JsArray>()?
        .to_vec(call.scope)?
        .into_iter()
        .map(|x| -> f64 { x.check::<JsNumber>().unwrap().value() })
        .collect::<Vec<f64>>();

    let mut max = nums[0];
    for x in nums {
        if x > max {
            max = x;
        }
    }
    Ok(JsNumber::new(call.scope, max))
}

fn one_hemisphere(call: Call) -> JsResult<JsBoolean> {
    let mut lats: Vec<f64> = call.arguments.require(call.scope, 0)?
        .check::<JsArray>()?
        .to_vec(call.scope)?
        .into_iter()
        .map(|x| -> f64 { 
            x.check::<JsArray>().unwrap()
            .to_vec(call.scope).unwrap()
            .into_iter()
            .map(|y| -> f64 {
                y.check::<JsNumber>().unwrap().value()
            })
            .collect::<Vec<f64>>()[1]
        })
        .collect::<Vec<f64>>();
    lats.sort_by(|a, b| a.partial_cmp(b).unwrap());

    Ok(JsBoolean::new(call.scope, max_gap(&lats) >= 180f64))
}

fn dist(a: f64, b: f64) -> f64 {
    (a - b).abs()
}

// fn compute_centroid(call: Call) -> JsResult<JsArray>

fn max_gap(lats: &Vec<f64>) -> f64 {
    let mut max_gap = 0f64;
    for i in 0..(lats.len() - 1) {
        println!("computing gap between {} and {}", lats[i], lats[i + 1]);
        let curr_gap = dist(lats[i], lats[i + 1]);
        println!("{} vs {}", curr_gap, max_gap);
        if curr_gap > max_gap {
            max_gap = curr_gap;
        }
    }

    // compute gap between last and first
    let wrap_gap = dist(lats[0], -180f64) + dist(lats[lats.len() - 1], 180f64);
    if wrap_gap > max_gap {
        max_gap = wrap_gap;
    }

    println!("found max gap of {}", max_gap);
    max_gap
}

fn get_rand_num(call: Call) -> JsResult<JsNumber> {
    let max = call.arguments.require(call.scope, 0)?.check::<JsNumber>()?.value();
    let mut r = OsRng::new().unwrap();
    let num = r.gen_range(0, max as i64);
    let scope = call.scope;
    Ok(JsNumber::new(scope, num as f64))
}

register_module!(m, {
    m.export("init", init)?;
    m.export("hello", hello)?;
    m.export("getRandNum", get_rand_num)?;
    m.export("getMax", get_max)?;
    m.export("oneHemisphere", one_hemisphere)?;
    Ok(())
});
