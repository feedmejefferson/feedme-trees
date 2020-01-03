import { BallTree } from "./ball-tree";
import { calculateCentroids, combine, distance, EMPTY_CENTROID } from "./tree-utils";

import * as chai from "chai";
import * as mocha from "mocha";


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

