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
use std::f64::{self, consts};
use std::fmt;

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


// 
// Latitude+longitude to 3d cartesian coords
// 
// (lat,lon)    (x, y, z)
// 
// (0, 0)    == (0, -1, 0)
// (0, -90)  == (-1, 0, 0)
// (0, -180) == (0, 1, 0)
// (0, 90)   == (1, 0, 0)
// (0, 180)  == (0, 1, 0)
// (90, _)   == (0, 0, 1)
// (-90, _)  == (0, 0, -1)
// 

#[derive(Debug)]
struct Point {
    x: f64,
    y: f64,
    z: f64,
}

impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({:.2}, {:.2}, {:.2})", self.x, self.y, self.z)
    }
}

fn one_hemisphere_xyz(points: Vec<Point>) -> bool {
    let mut possible_vertices = Vec::with_capacity(points.len() * points.len());
    for i in 0..points.len() {
        for j in 0..points.len() {
            if i != j {
                possible_vertices.push(cross(&points[i], &points[j]));
                possible_vertices.push(neg_cross(&points[i], &points[j]));
            }
        }
    }

    let mut vertices = Vec::new();
    for possible in &possible_vertices {
        let mut orth_all = true;
        for p in &points {
            if !orth_or_less(possible, p) {
                orth_all = false;
                break;
            }
        }
        if orth_all {
            vertices.push(possible);
        }
    }

    println!("{} final vertices", vertices.len());

    vertices.len() != 0
}

#[test]
fn one_hemisphere_test() {
    let rt2_over_2 = 2f64.sqrt() / 2.0;
    let pts = vec![
        Point { x: 0.0, y: rt2_over_2, z: rt2_over_2 },
        Point { x: rt2_over_2, y: 0.0, z: rt2_over_2 },
        Point { x: 0.0, y: (-1.0) * rt2_over_2, z: rt2_over_2 },
        Point { x: (-1.0) * rt2_over_2, y: 0.0, z: rt2_over_2 },
    ];
    assert!(one_hemisphere_xyz(pts));
}

fn cross(p1: &Point, p2: &Point) -> Point {
    let x = (p1.y * p2.z) - (p1.z * p2.y);
    let y = (p1.z * p2.x) - (p1.x * p2.z);
    let z = (p1.x * p2.y) - (p1.y * p2.x);
    Point { x: x, y: y, z: z }
}

fn neg_cross(p1: &Point, p2: &Point) -> Point {
    let x = (-1.0) * ((p1.y * p2.z) - (p1.z * p2.y));
    let y = (-1.0) * ((p1.z * p2.x) - (p1.x * p2.z));
    let z = (-1.0) * ((p1.x * p2.y) - (p1.y * p2.x));
    Point { x: x, y: y, z: z }
}

fn dot(p1: &Point, p2: &Point) -> f64 {
    (p1.x * p2.x) + (p1.y * p2.y) + (p1.z * p2.z)
}

fn mag(p: &Point) -> f64 {
    (p.x.powi(2) + p.y.powi(2) + p.z.powi(2)).sqrt()
}

fn orth_or_less(p1: &Point, p2: &Point) -> bool {
    let angle = (dot(p1, p2) / (mag(p1) * mag(p2))).acos();

    println!("angle between {} and {} is {}", p1, p2, angle);

    angle <= consts::PI/2.0
}

fn one_hemisphere_lat_lon(call: Call) -> JsResult<JsBoolean> {
    let mut lat_lons: Vec<Vec<f64>> = call.arguments.require(call.scope, 0)?
        .check::<JsArray>()?
        .to_vec(call.scope)?
        .into_iter()
        .map(|x| -> Vec<f64> { 
            x.check::<JsArray>().unwrap()
            .to_vec(call.scope).unwrap()
            .into_iter()
            .map(|y| -> f64 {
                y.check::<JsNumber>().unwrap().value()
            })
            .collect::<Vec<f64>>()
        })
        .collect::<Vec<Vec<f64>>>();

    let xyz_points: Vec<Point> = lat_lons
        .into_iter()
        .map(|v: Vec<f64>| to_xyz(v[0], v[1]))
        .collect::<Vec<Point>>();

    Ok(JsBoolean::new(call.scope, one_hemisphere_xyz(xyz_points)))
}

fn to_deg(rad: f64) -> f64 {
    rad * (180.0 / consts::PI)
}

fn to_rad(deg: f64) -> f64 {
    deg * (consts::PI / 180.0)
}

fn to_lat_lon(p: &Point) -> (f64, f64) {
    let lat = to_deg(p.z.asin());
    let w = (p.x.powi(2) + p.y.powi(2)).sqrt();
    let lon = to_deg((p.y / w).asin() + consts::PI/2.0);
    (lat, lon)
}

fn to_xyz(lat: f64, lon: f64) -> Point {
    let lat_rad = to_rad(lat);
    let lon_rad = to_rad(lon);

    let w = lat_rad.cos();
    let x = w * (lon_rad - consts::PI/2.0).cos();
    let y = w * (lon_rad - consts::PI/2.0).sin();
    let z = (lat_rad).sin();

    println!("({}, {}) -> ({:.2}, {:.2}, {:.2})", lat, lon, x, y, z);

    Point { x: x, y: y, z: z }
}

fn dist(a: f64, b: f64) -> f64 {
    (a - b).abs()
}

// fn compute_centroid(call: Call) -> JsResult<JsArray>

fn max_gap(lats: &Vec<f64>) -> f64 {
    let mut max_gap = 0.0;
    for i in 0..(lats.len() - 1) {
        println!("computing gap between {} and {}", lats[i], lats[i + 1]);
        let curr_gap = dist(lats[i], lats[i + 1]);
        println!("{} vs {}", curr_gap, max_gap);
        if curr_gap > max_gap {
            max_gap = curr_gap;
        }
    }

    // compute gap between last and first
    let wrap_gap = dist(lats[0], -180.0) + dist(lats[lats.len() - 1], 180.0);
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
    m.export("oneHemisphere", one_hemisphere_lat_lon)?;
    Ok(())
});
