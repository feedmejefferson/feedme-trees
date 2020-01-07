import { readFile as rf } from "fs";
import { promisify } from "util";
import { BallTree } from "./ball-tree";
import { accumulate, asCentroid, calculateCentroids, combine, difference, distance, EMPTY_CENTROID, nearestBranch } from "./tree-utils";

import * as chai from "chai";
import * as mocha from "mocha";
import { Centroid, Point } from "./types";

const readFile = promisify(rf);
const expect = chai.expect;

describe('test functions', () => {
    it('combine', () => {
        const a = { w: 1, radius: 0, v: [1,2,3]}
        const b = { w: 1, radius: 0, v: [3,2,1]}
        const c = combine(a,b)
        const d = [a,b,c].reduce(combine,EMPTY_CENTROID);
        expect(c.w).to.equal(2);
        expect(c.v).to.deep.equal([2,2,2]);
        expect(d.w).to.equal(4);
        expect(d.v).to.deep.equal([2,2,2]);
    });
    it('distance', () => {
        const a = { v: [0,3]}
        const b = { v: [4,0]}
        expect(distance(a,b)).to.equal(5);
    });
    it('calculate centroids recursively', () => {
        const tree = JSON.parse('{"4":{"id":"04","v":[0,4]},"5":{"id":"05","v":[0,0]},"6":{"id":"06","v":[4,0]},"7":{"id":"07","v":[0,0]}}')
        calculateCentroids(tree,1)
        expect(tree["1"].w).to.equal(4)
        expect(tree["2"].w).to.equal(2)
        expect(tree["3"].w).to.equal(2)
        expect(tree["1"].v).to.deep.equal([1,1])
        expect(tree["2"].v).to.deep.equal([0,2])
        expect(tree["3"].v).to.deep.equal([2,0])
    });
    
});

describe('Some tree tests', () => {
    it('basic tree should work', () => {
        const tree = new BallTree(JSON.parse('{"4":{"id":"04","v":[0,4]},"5":{"id":"05","v":[0,0]},"6":{"id":"06","v":[6,0]},"7":{"id":"07","v":[6,4]}}'));
        expect(tree.getFirst(1).id).to.equal("04");
        expect(tree.getFirst(2).id).to.equal("04");
        expect(tree.getFirst(3).id).to.equal("06");
        expect(tree.nn({v:[1,1]}).id).to.equal("05");
    })
})



describe('Real world tests', () => {
    it('real world tree should work', async () => {
        const realtree = (await readFile("src/test-tree.json")).toString()
        const t = JSON.parse(realtree);
        // const t2 = {...t}
        // calculateCentroids(t2, 1);
        // console.log(t2)
        const points = Object.keys(t).map(k=>t[k]);
        const tree = new BallTree(JSON.parse(realtree));
        // const point = points.filter(p=>p.id==="0003194")[0]
        // console.log(point)
        // const nearest = tree.nn(point);
        // console.log(nearest)
        const lost = points.map(p=>([p.id,tree.nn(p).id])).filter(([p1,p2])=>p1!==p2)
        console.log("bad count: ", lost.length)
        console.log(lost)
        let count = 0;
        let partialCount = 0;
        const x = [];
//        x.forEach(p=>{
        points.forEach(p=>{
            const goal = tree.nb(p,6)
            let goalAttained = false;
            let clicks = 1;
            let branchClicks = 0;
            let depth=0;
            let branch = 1;
            let found = tree.get(branch);
            const origin = {v: tree.get(1).v}
            let accumulator = {v: origin.v, w: 0, path: []};

            while(clicks<40 && !('id' in found)) {
                const a = tree.getRandom(branch*2,Math.random())
                const b = tree.getRandom(branch*2+1,Math.random())
                const diff = distance(a,p)<distance(b,p) ? difference(a,b,found as Centroid) : difference(b,a,found as Centroid);
                accumulator = accumulate(accumulator, diff,branch)
                branch = tree.nb(accumulator,depth);
                console.log(
                    p.id,
                    tree.nn(p).id,
                    distance(accumulator,p).toFixed(3), 
                    tree.nb(p,depth)===branch, 
                    tree.nb(p,depth),
                    branch,
                    found.w, 
                    found.r.toFixed(3), 
                    distance(a,b).toFixed(3), 
                    distance(a,p).toFixed(3), 
                    distance(b,p).toFixed(3), 
                    distance(accumulator, a).toFixed(3), 
                    distance(accumulator, b).toFixed(3))
                const branchSize = tree.get(branch).w
                branchClicks++;
                if(branchClicks>Math.log2(branchSize)/4) { branchClicks=0; depth++ }
                if(!goalAttained && branch===goal) { goalAttained=true}
                found = tree.get(branch)
                clicks++
            }

            console.log(p.id, (found.id===p.id), goalAttained, distance(p,found as Point), clicks, branch, found.id, `${found.id},${p.id}` )
            count += found.id===p.id ? 1 : 0;
            partialCount += goalAttained ? 1 : 0;

            // const nn = tree.nn(p)
            // count += nn.id===p.id ? 0 : 1;
//            expect(tree.nn(p)).to.deep.equal(p);
//                console.log(p.id, (nn.id===p.id), `${nn.id},${p.id}`)
        })
        console.log("score: ", partialCount, count)
    })
})
