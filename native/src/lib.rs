extern crate env_logger;
#[macro_use]
extern crate log;
#[macro_use]
extern crate neon;
extern crate rand;
extern crate rayon;

use neon::js::{JsNull, JsNumber, JsArray};
use neon::vm::{Call, JsResult};
use std::f64::{self, consts};
use std::fmt;
use rayon::prelude::*;
use neon::mem::Handle;
use neon::js::Object;
use std::collections::HashSet;
use std::hash::{Hash, Hasher};

// Initialize this extension.
fn init(_call: Call) -> JsResult<JsNull> {
    env_logger::init().expect("could not initialize env_logger");
    Ok(JsNull::new())
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
impl PartialEq for Point {
    fn eq(&self, other: &Point) -> bool {
        self.x == other.x &&
        self.y == other.y &&
        self.z == other.z
    }
}
impl Eq for Point {}
impl Hash for Point {
    fn hash<H: Hasher>(&self, state: &mut H) {
        (self.x as u64).hash(state);
        (self.y as u64).hash(state);
        (self.z as u64).hash(state);
    }
}

fn project(p: &Point) -> Point {
    let m = mag(p);
    Point {
        x: p.x / m,
        y: p.y / m,
        z: p.z / m,
    }
}

fn compute_centroid_xyz(points: &Vec<Point>) -> Result<Point, String> {
    let vertices = one_hemisphere_xyz(points);
    if vertices.len() == 0 {
        println!("Points not contained in one hemishpere.");
        return Err("Points not contained in one hemishpere.".to_string());
    }

    let avg_x = points.iter().fold(0.0, |acc, ref p| acc + p.x) / (points.len() as f64);
    let avg_y = points.iter().fold(0.0, |acc, ref p| acc + p.y) / (points.len() as f64);
    let avg_z = points.iter().fold(0.0, |acc, ref p| acc + p.z) / (points.len() as f64);
    println!("avg_x is {}; avg_y is {}; avg_z is {}", avg_x, avg_y, avg_z);
    let centroid = project(&Point { x: avg_x, y: avg_y, z: avg_z});

    println!("projected centroid is {:?} with magnitude {}", centroid, mag(&centroid));
    Ok(centroid)
}

// TODO: handle when there are duplicate points
fn one_hemisphere_xyz(points: &Vec<Point>) -> Vec<Point> {
    let mut possible_vertices = Vec::with_capacity(points.len() * points.len());
    for i in 0..points.len() {
        for j in 0..points.len() {
            if i != j {
                possible_vertices.push(cross(&points[i], &points[j]));
                possible_vertices.push(neg_cross(&points[i], &points[j]));
            }
        }
    }

    let vertices: Vec<Point> = possible_vertices.into_par_iter().filter(|possible| {
        for p in points {
            if !orth_or_less(&possible, p) {
                return false;
            }
        }
        true
    }).collect();

    vertices
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
    angle <= consts::PI/2.0
}

fn dedup_points(mut points: Vec<Point>) -> Vec<Point> {
    let set: HashSet<_> = points.drain(..).collect(); // dedup
    points.extend(set.into_iter());
    points
}

fn compute_centroid_lat_lon(call: Call) -> JsResult<JsArray> {
    let lat_lons: Vec<Vec<f64>> = call.arguments.require(call.scope, 0)?
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

    let mut xyz_points: Vec<Point> = lat_lons
        .into_iter()
        .map(|v: Vec<f64>| to_xyz(v[0], v[1]))
        .collect::<Vec<Point>>();
    xyz_points = dedup_points(xyz_points);

    println!("xyz points are:");
    for p in &xyz_points {
        println!("{:?} {:?} ({})", to_lat_lon(p), p, mag(p));
    }

    let centroid: Result<Point, String> = compute_centroid_xyz(&xyz_points);
    match centroid {
        Ok(p) => {
            let arr: Handle<JsArray> = JsArray::new(call.scope, 3);
            let (lat, lon) = to_lat_lon(&p);
            println!("centroind lat lon is {:?}", (lat, lon));
            arr.set(0, JsNumber::new(call.scope, lat)).unwrap();
            arr.set(1, JsNumber::new(call.scope, lon)).unwrap();
            Ok(arr)
        },
        Err(_) => {
            // Err(Throw)

            let arr: Handle<JsArray> = JsArray::new(call.scope, 0);
            Ok(arr)
        }
    }
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
    let theta = to_deg((p.y / w).asin()).abs();
    println!("theta is {}", theta);
    let lon;
    if p.x > 0.0 && p.y > 0.0 { // 1st quadrant
        lon = theta + 90.0;
    } else if p.x < 0.0 && p.y > 0.0 { // 2nd quadrant
        lon = -90.0 - theta;
    } else if p.x < 0.0 && p.y < 0.0 { // 3rd quadrant
        lon = theta - 90.0;
    } else { // 4th quadrant
        lon = 90.0 - theta;
    }

    (lat, lon)
}

fn to_xyz(lat: f64, lon: f64) -> Point {
    let lat_rad = to_rad(lat);
    let lon_rad = to_rad(lon);

    let w = lat_rad.cos();
    let x = w * (lon_rad - consts::PI/2.0).cos();
    let y = w * (lon_rad - consts::PI/2.0).sin();
    let z = (lat_rad).sin();

    Point { x: x, y: y, z: z }
}

register_module!(m, {
    m.export("init", init)?;
    m.export("getMax", get_max)?;
    m.export("computeCentroid", compute_centroid_lat_lon)?;
    Ok(())
});


#[cfg(test)]
mod tests {
    use super::*;

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
}
