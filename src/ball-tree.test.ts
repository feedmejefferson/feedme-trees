import { readFile as rf } from "fs";
import { promisify } from "util";
import { BallTree } from "./ball-tree";
// import { accumulate, asCentroid, calculateCentroids, combine, difference, distance, EMPTY_CENTROID, nearestBranch } from "./tree-utils";
import { accumulator, asBall, calculateCentroids, containerBall, distance, intersectingBranches, knc, knn, intersection, randomLeaf, intersectsHalfspace, bisectPoints, pruneHalfspace } from "./tree-utils";

import * as chai from "chai";
import * as mocha from "mocha";
import { Centroid, Point, LeafNode, Hyperplane, Ball } from "./types";

const readFile = promisify(rf);
const expect = chai.expect;

describe('test functions', () => {
    it('distance', () => {
        const a = [0,3]
        const b = [4,0]
        expect(distance(a,b)).to.equal(5);
    });
    it('containerBall', () => {
        const a = asBall([1,2,3])
        const b = asBall([3,2,1])
        const c = containerBall(a,b)
//        const d = [a,b,c].reduce(combine,EMPTY_CENTROID);
        expect(c.weight).to.equal(2);
        expect(c.centroid).to.deep.equal([2,2,2]);

        let d = containerBall(
            { center: [0], radius: 0, centroid:[0], weight: 2, },
            { center: [7], radius: 3, centroid: [6], weight: 1 }
        )
        expect(d.radius).to.equal(5);
        expect(d.center).to.deep.equal([5]);
        expect(d.weight).to.equal(3);
        expect(d.centroid).to.deep.equal([2]);
        
        d = containerBall(
            { center: [-2], radius: 8, centroid:[-5], weight: 2, },
            { center: [4], radius: 6, centroid: [5], weight: 3 }
        )
        expect(d.radius).to.equal(10);
        expect(d.center).to.deep.equal([0]);
        expect(d.weight).to.equal(5);
        expect(d.centroid).to.deep.equal([1]);
    });
    it('fully overlapping balls', () => {
        const c = containerBall(asBall([1]), asBall([1]))
        expect(c.weight).to.equal(2);
        expect(c.centroid).to.deep.equal([1]);
        expect(c.radius).to.equal(0);
        expect(c.centroid).to.deep.equal([1]);

        const d = containerBall(
            { center: [5], radius: 4, centroid:[5], weight: 1, },
            { center: [4], radius: 2, centroid: [4], weight: 1 }
        )
        expect(d.radius).to.equal(4);
        expect(d.center).to.deep.equal([5]);
        expect(d.weight).to.equal(2);
        expect(d.centroid).to.deep.equal([4.5]);
        
    });
    it('calculate centroids recursively', () => {
        const tree = JSON.parse('{"4":{"id":"04","v":[0,6]},"5":{"id":"05","v":[0,0]},"6":{"id":"06","v":[8,0]},"7":{"id":"07","v":[0,0]}}')
        Object.keys(tree).forEach(k=>{
            tree[k]={...asBall(tree[k].v), id: tree[k].id}
        })
        calculateCentroids(tree,1)
        expect(tree["1"].weight).to.equal(4)
        expect(tree["2"].weight).to.equal(2)
        expect(tree["3"].weight).to.equal(2)
        expect(tree["1"].centroid).to.deep.equal([2,1.5])
        expect(tree["2"].centroid).to.deep.equal([0,3])
        expect(tree["3"].centroid).to.deep.equal([4,0])
        expect(tree["1"].radius).to.equal(6)
        expect(tree["2"].radius).to.equal(3)
        expect(tree["3"].radius).to.equal(4)
        expect(tree["1"].center).to.deep.equal([2.4,1.2])
        expect(tree["2"].center).to.deep.equal([0,3])
        expect(tree["3"].center).to.deep.equal([4,0])

        const i = intersection(tree,{center: [0,3], radius: 4, centroid: [0,0], weight:0})
        expect(i["1"].weight).to.equal(3)
        expect(i["1"].centroid).to.deep.equal([0,2])
        const i2 = intersection(tree,{center: [0,3], radius: 3, centroid: [0,0], weight:0})
        expect(i2["1"].weight).to.equal(3)
    });
    it('hyperplanes', () => {
        // all points x > 2
        const h1: Hyperplane = { normal: [1,0,0], offset: 2 }
        // all points x < -2
        const h2: Hyperplane = { normal: [-1,0,0], offset: 2 }
        // negative form of h1 -- everything below POSITIVE two rather than above
        // all points x < 2
        const h3: Hyperplane = { normal: [-1,0,0], offset: -2 } 
        expect(intersectsHalfspace(asBall([3,0,0]),h1)).to.equal(true);
        expect(intersectsHalfspace(asBall([1,0,0]),h1)).to.equal(false);
        expect(intersectsHalfspace(asBall([-5,0,0]),h1)).to.equal(false);
        expect(intersectsHalfspace(asBall([-5,0,0]),h2)).to.equal(true);
        const b1: Ball = { radius: 5, center: [10,0,0], centroid: [0,0,0], weight: 1 }
        const b2: Ball = { radius: 5, center: [5,0,0], centroid: [0,0,0], weight: 1 }
        const b3: Ball = { radius: 5, center: [0,100,0], centroid: [0,0,0], weight: 1 }
        const b4: Ball = { radius: 5, center: [-5,0,0], centroid: [0,0,0], weight: 1 }
        const b5: Ball = { radius: 5, center: [-10,0,0], centroid: [0,0,0], weight: 1 }
        expect(intersectsHalfspace(b1,h1)).to.equal(true);
        expect(intersectsHalfspace(b2,h1)).to.equal(true);
        expect(intersectsHalfspace(b3,h1)).to.equal(true);
        expect(intersectsHalfspace(b4,h1)).to.equal(false);
        expect(intersectsHalfspace(b5,h1)).to.equal(false);

        expect(intersectsHalfspace(b1,h2)).to.equal(false);
        expect(intersectsHalfspace(b2,h2)).to.equal(false);
        expect(intersectsHalfspace(b3,h2)).to.equal(true);
        expect(intersectsHalfspace(b4,h2)).to.equal(true);
        expect(intersectsHalfspace(b5,h2)).to.equal(true);

        expect(intersectsHalfspace(b1,h3)).to.equal(false);
        expect(intersectsHalfspace(b2,h3)).to.equal(true);
        expect(intersectsHalfspace(b3,h3)).to.equal(true);
        expect(intersectsHalfspace(b4,h3)).to.equal(true);
        expect(intersectsHalfspace(b5,h3)).to.equal(true);

        const a = [0,4]
        const b = [0,2]
        const upper = bisectPoints(a,b)
        const lower = bisectPoints(b,a)
        expect(upper).to.deep.equal({normal: [0,1], offset: 3})
        expect(lower).to.deep.equal({normal: [0,-1], offset: -3})
        // a should be in upper, b should be in lower
        expect(intersectsHalfspace(asBall(a),upper)).to.equal(true)
        expect(intersectsHalfspace(asBall(b),upper)).to.equal(false)
        expect(intersectsHalfspace(asBall(a),lower)).to.equal(false)
        expect(intersectsHalfspace(asBall(b),lower)).to.equal(true)
    });
});

describe('Some tree tests', () => {
    it('basic tree should work', () => {
        // const tree = new BallTree(JSON.parse('{"4":{"id":"04","v":[0,4]},"5":{"id":"05","v":[0,0]},"6":{"id":"06","v":[6,0]},"7":{"id":"07","v":[6,4]}}'));
        // expect(tree.getFirst(1).id).to.equal("04");
        // expect(tree.getFirst(2).id).to.equal("04");
        // expect(tree.getFirst(3).id).to.equal("06");
        // expect(tree.nn({v:[1,1]}).id).to.equal("05");
    })
})


// describe('Real world tests', () => {
//     it('real world tree should work', async () => {
//         const realtree = (await readFile("src/test-tree.json")).toString()
//         const t = JSON.parse(realtree);
//         Object.keys(t).forEach(k=>{
//             t[k]={...asBall(t[k].v), id: t[k].id}
//         })
//         calculateCentroids(t,1)
//         const a = t['24'];
//         const b = t['314'];
//         // const c = intersectingBranches(t,1,a).map(x=>t[x])
//         // const d = intersectingBranches(t,1,b).map(x=>t[x])
// //        console.log(b,knn(t,1,b.center,5))
        
        
//     })
// })


describe('Real world tests', () => {
    it('real world tree should work', async () => {
        const realtree = (await readFile("src/test-tree.json")).toString()
        const t = JSON.parse(realtree);
        const points = Object.keys(t).map(d=>t[d]);
        Object.keys(t).forEach(k=>{
            t[k]={...asBall(t[k].v), id: t[k].id}
        })
//        const tree = new BallTree(t);
        const tree = {...t}
        calculateCentroids(tree,1)
        // const point = points.filter(p=>p.id==="0003194")[0]
        // console.log(point)
        // const nearest = tree.nn(point);
        // console.log(nearest)
//        const lost = points.map(p=>([p.id,tree.nn(p.v).id])).filter(([p1,p2])=>p1!==p2)
        // console.log("bad count: ", lost.length)
        // console.log(lost)
        let found =0;
        const x = [];
//        x.forEach(p=>{
//        points.splice(0,10).forEach(px=>{
        points.forEach(px=>{
            const p = px.v;
            const id = px.id;
            let clicks = 1;
//            console.log(tree)
 
           let intersect = {...tree}
           // let radius = intersect[1].radius;
            let weight = intersect[1].weight;
            const acc = accumulator(intersect)

            while(clicks<40 && weight>1) {
                const medoid = intersect[knn(intersect,1,intersect[1].centroid,1)[0]] as LeafNode;
                const radius = intersect[1].radius;                
                const nn = intersect[knn(intersect,1,p,1)[0]] as LeafNode
                const hasPoint = nn.id===id;
                const ax = randomLeaf(intersect,2)
                const a = ax.center
                const aid = ax.id
                let bx = randomLeaf(intersect,3)
                while(bx===ax){
                    bx = randomLeaf(intersect)
                }
                const b = bx.center
                const bid = bx.id
                console.log(id, medoid.id, hasPoint,
                    "   ",
                    aid, bid,
                    "   ",
                    distance(p,a).toFixed(3), 
                    distance(p,b).toFixed(3), 
                    distance(b,a).toFixed(3), 
                    "   ",
                    distance(p,medoid.centroid).toFixed(3), 
                    distance(p,intersect[1].centroid).toFixed(3), 
                    "   ",
                    radius.toFixed(3),
                    weight)
                const diff = distance(a,p)<distance(b,p) 
                    ? acc.accumulate(a,b) 
                    : acc.accumulate(b,a);
                const expectedP = acc.convergence()[1];
                intersect = acc.convergence();
//                console.log(aid, bid)
                weight = intersect[1].weight;
                clicks++
            }
            const medoid = intersect[knn(intersect,1,intersect[1].centroid,1)[0]] as LeafNode;

            console.log(id, medoid.id, 
                "   ",
                distance(p,medoid.centroid).toFixed(3), 
                distance(p,intersect[1].centroid).toFixed(3), 
                "   ",
//                radius.toFixed(3),
                weight)

            console.log()
//            console.log(tree.nn(acc.convergence()).id, id)
            // if(tree.nn(acc.convergence()).id===id) {
            //     found +=1;
            // }

            // console.log(p.id, (found.id===p.id), distance(p,found as Point), clicks, branch, found.id, `${found.id},${p.id}` )
            // count += found.id===p.id ? 1 : 0;
            // partialCount += goalAttained ? 1 : 0;

            // const nn = tree.nn(p)
            // count += nn.id===p.id ? 0 : 1;
//            expect(tree.nn(p)).to.deep.equal(p);
//                console.log(p.id, (nn.id===p.id), `${nn.id},${p.id}`)
        })
        console.log("found:", found)
    })
})

// describe('Real world tests', () => {
//     it('real world tree should work', async () => {
//         const realtree = (await readFile("src/test-tree.json")).toString()
//         const t = JSON.parse(realtree);
//         const points = Object.keys(t).map(d=>t[d]);
//         Object.keys(t).forEach(k=>{
//             t[k]={...asBall(t[k].v), id: t[k].id}
//         })
//         const tree = new BallTree(t);
//         // const point = points.filter(p=>p.id==="0003194")[0]
//         // console.log(point)
//         // const nearest = tree.nn(point);
//         // console.log(nearest)
//         const lost = points.map(p=>([p.id,tree.nn(p.v).id])).filter(([p1,p2])=>p1!==p2)
//         // console.log("bad count: ", lost.length)
//         // console.log(lost)
//         let found =0;
//         const x = [];
// //        x.forEach(p=>{
//         points.forEach(px=>{
//             const p = px.v;
//             const id = px.id;
//             let clicks = 1;
//             let clusterSize = 256;
//             let branch = 1;
//             // let currentBall = tree.get(branch);
//             const origin = tree.get(1).centroid
//             const randomStart = tree.getRandom(1).center;
// //            let accumulator = {v: origin.v, w: 0, path: []};
// //            const acc = accumulator(randomStart);
//             const acc = accumulator(origin);

//             while(clicks<40 && clusterSize>2) {
//                 branch = tree.nc(acc.convergence(),clusterSize)
//                 const currentBall = tree.get(branch)
//                 // const branchA = branch*2;
//                 // const branchB = branchA + 1;
//                 const branchA = branch;
//                 const branchB = branch;
//                 const ballA = tree.get(branchA);
//                 const ballB = tree.get(branchB)
//                 const ax = tree.getRandom(branchA)
//                 const a = ax.center
//                 const aid = ax.id
// //                const ballA = tree.nn(acc.convergence());
// //                const a = ballA.center;
//                 let bx = tree.getRandom(branchB)
//                 while(bx===ax){
//                     bx=tree.getRandom(branchB);
//                 }
//                 const b = bx.center
//                 const bid = bx.id
//                 const diff = distance(a,p)<distance(b,p) 
//                     ? acc.accumulate(a,b,ballA,ballB) 
//                     : acc.accumulate(b,a,ballB,ballA);
//                 const expectedP = acc.convergence();
//                 console.log(
//                     id,
//                     tree.nn(expectedP).id,
//                     "   ",
//                     aid,
//                     bid,
//                     currentBall.weight,
//                     distance(expectedP,p).toFixed(3), 
//                     "   ",
// //                    distance(expectedP, currentBall.centroid).toFixed(3),
//  //                   distance(p,currentBall.centroid).toFixed(3),
//                     distance(expectedP,origin).toFixed(3), 
// //                    distance(p,randomStart).toFixed(3),
//                     "   ", 
// //                    clusterSize,
// //                    tree.nc(p,clusterSize)===branch, 
// //                    tree.nc(p,clusterSize),
// //                    branch,
// //                    currentBall.weight, 
// //                    currentBall.radius.toFixed(3), 
//                     distance(a,b).toFixed(3), 
//                     distance(a,p).toFixed(3), 
//                     distance(b,p).toFixed(3), 
//                     "   ",
//                     distance(expectedP, a).toFixed(3), 
//                     distance(expectedP, b).toFixed(3))
//                 const branchSize = tree.get(branch).weight
//                 // currentBall = tree.get(branch)
//                 clicks++
// //                clusterSize = Math.floor(clusterSize * .95);
// //                branch = tree.nc(converge,clusterSize);
// //                clusterSize=clusterSize*.9;
//             }
//             console.log()
// //            console.log(tree.nn(acc.convergence()).id, id)
//             if(tree.nn(acc.convergence()).id===id) {
//                 found +=1;
//             }

//             // console.log(p.id, (found.id===p.id), distance(p,found as Point), clicks, branch, found.id, `${found.id},${p.id}` )
//             // count += found.id===p.id ? 1 : 0;
//             // partialCount += goalAttained ? 1 : 0;

//             // const nn = tree.nn(p)
//             // count += nn.id===p.id ? 0 : 1;
// //            expect(tree.nn(p)).to.deep.equal(p);
// //                console.log(p.id, (nn.id===p.id), `${nn.id},${p.id}`)
//         })
//         console.log("found:", found)
//     })
// })
