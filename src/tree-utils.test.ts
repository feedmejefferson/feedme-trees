import { TreeIndex } from "./types";
import { validateTree } from "./tree-utils";

import * as chai from "chai";
import * as mocha from "mocha";


const expect = chai.expect;
const goodTree: TreeIndex = {3: "003", 4: "004", 5: "005"};
const badTree: TreeIndex = {3: "003", 4: "004"};

describe('Some validation tests', () => {
    it('should validate a good tree', () => {
        /* tslint:disable:no-unused-expression */
        expect(validateTree(goodTree)).is.true;
    })
    it('should invalidate a bad tree', () => {
        expect(validateTree(badTree)).is.false;
    })
})
