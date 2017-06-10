extern crate env_logger;
#[macro_use]
extern crate log;
#[macro_use]
extern crate neon;
extern crate rand;

use neon::js::{JsNull, JsString, JsNumber};
use neon::vm::{Call, JsResult};
use std::thread;
use rand::os::OsRng;
use rand::Rng;
use neon::vm::Lock;

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

fn get_rand_num(call: Call) -> JsResult<JsNumber> {
    let mut max = call.arguments.require(call.scope, 0)?.check::<JsNumber>()?;
    // let max = Lock::grab(max, |data| { data });
    // max.grab(|data| { data });

    let mut r = OsRng::new().unwrap();
    let num = r.next_u32();
    let scope = call.scope;
    Ok(JsNumber::new(scope, num as f64))
}

register_module!(m, {
    m.export("init", init)?;
    m.export("hello", hello)?;
    m.export("getRandNum", get_rand_num)?;
    Ok(())
});
