extern crate env_logger;
#[macro_use]
extern crate log;
#[macro_use]
extern crate neon;
extern crate rand;

use neon::js::{JsNull, JsString};
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

register_module!(m, {
    try!(m.export("init", init));
    m.export("hello", hello)
});
