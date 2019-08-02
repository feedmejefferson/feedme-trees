import { expandTree, validateTree } from "./tree-utils";
import { TreeExpansion, TreeIndex } from "./types";

import * as chai from "chai";
import * as mocha from "mocha";


const expect = chai.expect;
const goodTree: TreeIndex = {3: "003", 4: "004", 5: "005"};
const badTree: TreeIndex = {3: "003", 4: "004"};
const expansion: TreeExpansion = { 4: {8: "008", 9: "009"}, 5: {10: "010", 11: "011"}};
const expandedTree: TreeExpansion = {3: "003", 8: "008", 9: "009", 10: "010", 11: "011"};

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


