import { branchNodes, expandTree, maxDepth, relativeAt, validateTree } from "./tree-utils";
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
    })
})

describe('Some branch node tests', () => {
    it('should be able to filter nodes of a branch', () => {
        expect(branchNodes(goodTree,2)).deep.equals(branch2);
        expect(branchNodes(goodTree,3)).deep.equals(branch3);
    })
})
