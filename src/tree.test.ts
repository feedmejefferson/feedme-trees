import { IndexedTree } from "./tree";

import * as chai from "chai";
import * as mocha from "mocha";


const expect = chai.expect;

describe('Some tree tests', () => {
    it('basic tree should work', () => {
        const tree = new IndexedTree(JSON.parse('{"8":"008","9":"009","10":"010","11":"011","12":"012","13":"013","14":"014","15":"015"}'))
        expect(tree.getFirst(1)).to.equal("008");
        expect(tree.getFirst(4)).to.equal("008");
        expect(tree.getFirst(5)).to.equal("010");
        expect(tree.getRandom(1,0)).to.equal(tree.getFirst(1));
        /* disable checks for chai style dirty expressions 
        for the rest of the file */
        /* tslint:disable:no-unused-expression */
        expect(tree.ancestorNodeId(5)).is.not.ok; // is falsy
        expect(tree.ancestorNodeId(16)).to.equal(8)
        expect(tree.firstChildNodeId(3)).to.equal(12);
    })
})

