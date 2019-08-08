import { ancestor, branchNodes, expandTree, maxDepth, relativeAt, splitTree, validateTree } from "./tree-utils";
import { TreeExpansion, TreeIndex } from "./types";

import * as chai from "chai";
import * as mocha from "mocha";


const expect = chai.expect;
const goodTree: TreeIndex = {3: "003", 4: "008", 5: "010"};
const branch2: TreeIndex = {4: "008", 5: "010"};
const branch3: TreeIndex = {3: "003"};
const badTree: TreeIndex = {3: "003", 4: "004"};
const expansion: TreeExpansion = { 4: {8: "008", 9: "009"}, 5: {10: "010", 11: "011"}};
const expandedTree: TreeIndex = {3: "003", 8: "008", 9: "009", 10: "010", 11: "011"};
const bigTree: TreeIndex = {
    4: "004", 10: "010", 22: "022", 46: "046", 94: "094", 95: "095",
    7: "007", 13: "013", 25: "025", 49: "049", 96: "096", 97: "097" };


describe('Some validation tests', () => {
    it('should validate a good tree', () => {
        /* tslint:disable:no-unused-expression */
        expect(validateTree(goodTree)).is.true;
    })
    it('should invalidate a bad tree', () => {
        expect(validateTree(badTree)).is.false;
    })
})

describe('Some tree expansion tests', () => {
    it('should be able to expand a good tree', () => {
        const expanded = expandTree(goodTree, expansion)
        expect(validateTree(expanded)).is.true;
        expect(expanded["11"]).equals("011");
        expect(expanded["5"]).is.not.ok;
        expect(expanded).deep.equals(expandedTree);
    })
})


describe('Some relative branch tests', () => {
    it('should be able to find relative nodes', () => {
        expect(ancestor(expandedTree, 16)).equals(8);
        expect(ancestor(expandedTree, 8)).equals(8);
        expect(ancestor(expandedTree, 4)).is.not.ok;
        expect(relativeAt(expandedTree,2,0)).equals(8);
        expect(relativeAt(expandedTree,2,1)).equals(11);
        expect(relativeAt(expandedTree,2,2)).equals(8);
        expect(relativeAt(expandedTree,2,3)).equals(11);
        expect(relativeAt(expandedTree,2,8)).equals(8);
        expect(relativeAt(expandedTree,2,9)).equals(8);
    })
})

describe('Some max depth tests', () => {
    it('should be able to find max depth', () => {
        expect(maxDepth(expandedTree,2)).equals(2);
        expect(maxDepth(expandedTree,3)).equals(0);
        expect(maxDepth(expandedTree,1)).equals(3);
        expect(maxDepth(expandedTree,5)).equals(1);
        // TODO: fix this for branches outside of tree limits
        //        expect(maxDepth({},5)).equals(0);
    })
})

describe('Some branch node tests', () => {
    it('should be able to filter nodes of a branch', () => {
        expect(branchNodes(goodTree,2)).deep.equals(branch2);
        expect(branchNodes(goodTree,3)).deep.equals(branch3);
    })
})

describe('Some tree splitting tests', () => {
    it('simple tree should be its own core', () => {
        expect(splitTree(goodTree,2,1).core).deep.equals(goodTree)
    })
    it('extreme pruning should split simple tree', () => {
        const separated = splitTree(goodTree,1,1);
        expect(separated.core).deep.equals({2:"008",3:"003"})
        expect(separated["1"]).deep.equals({2:{4:"008",5:"010"}})
    })
    it('should be able to split a bigger tree', () => {
        const separated = splitTree(expandedTree, 2,1)
        expect(separated.core).deep.equals(goodTree);
        expect(separated["1"]).deep.equals(expansion);
    })
    it('should be able to split a really big tree', () => {
        const separated = splitTree(bigTree, 3, 2)
        expect(validateTree(separated.core)).is.true;
        expect(separated.core["11"]).equals("022");
        expect(separated.core["12"]).equals("096");
        let rehydrated = separated.core;
        delete(separated.core);
        Object.keys(separated).forEach(k => {
            rehydrated = expandTree(rehydrated, separated[k])
        })
        expect(rehydrated).deep.equals(bigTree);
        expect(Object.keys(separated).length).equals(3) // baskets 1, 5 and 6
    })
    it('should split a perfectly balanced tree', () => {
        const depth = 7;
        const size = 1<<depth;
        expect(size).to.equal(128);
        const tree = {};
        Array.from(Array(size).keys()).map(x=>x+size).forEach(x=>{tree[(x)]=x.toString(16)});
        expect(validateTree(tree)).is.true
        const separated = splitTree(tree, 4, 2);
        const core = {...separated.core};
        expect(Object.keys(core).length).to.equal(16)
        const expanded = expandTree(core,separated[1]);
        expect(Object.keys(expanded).length).to.equal(64)
        expect(separated[2]).is.not.ok;
        expect(separated[3]).is.not.ok;
        expect(separated[4]).is.ok;
        let rehydrated = separated.core;
        delete(separated.core);
        Object.keys(separated).forEach(k => {
            rehydrated = expandTree(rehydrated, separated[k])
        })
        expect(rehydrated).deep.equals(tree);
    })
    it('should split adams apple correctly', () => {
        // this was the actual first tree that we were using with adams apple
        // (or at least the keys -- I've replaced the values with hex key values)
        const adam = [33,34,35,37,38,39,41,42,43,45,46,47,49,50,51,53,54,55,57,58,59,61,62,63,64,65,72,73,80,81,88,89,96,97,104,105,112,113,120,121]
        const tree = {};
        adam.forEach(x=>{tree[(x)]=x.toString(16)});
        expect(validateTree(tree)).is.true
        const separated = splitTree(tree, 2, 2);
        const core = {...separated.core};
        expect(Object.keys(core).length).to.equal(4)
        const expanded = expandTree(core,separated[1]);
        expect(Object.keys(expanded).length).to.equal(16)
        expect(separated[2]).is.not.ok;
        expect(separated[3]).is.not.ok;
        expect(separated[4]).is.ok;
        let rehydrated = separated.core;
        delete(separated.core);
        Object.keys(separated).forEach(k => {
            rehydrated = expandTree(rehydrated, separated[k])
        })
        expect(rehydrated).deep.equals(tree);
    })

})

