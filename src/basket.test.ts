import { expect } from "chai";
import { Basket } from "./basket";

const baseAttr = { 
  id: "", 
  title: "title", 
  originTitle: "", 
  originUrl: "", 
  license: "", 
  licenseUrl: "" 
};
const simpleBasket = { 
  tree: {2: "02", 3: "03"}, 
  attributions: {
    "02": {...baseAttr, id: "02"},
    "03": {...baseAttr, id: "03"}
  },
  baskets: {2: "2", 4: "4"}
};
const simpleExpansion = { 
  id: "2",
  tree: {2:{4: "04", 5: "05"}}, 
  attributions: {
    "04": {...baseAttr, id: "04"},
    "05": {...baseAttr, id: "05"}
  }
};
const secondExpansion = { 
  id: "4",
  tree: {4:{8: "08", 9: "09"}}, 
  attributions: {
    "08": {...baseAttr, id: "08"},
    "09": {...baseAttr, id: "09"}
  }
};


describe('Some simple basket tests', () => {
  it('should be able to create a basket', () => {
      /* tslint:disable:no-unused-expression */
      const b = new Basket(simpleBasket)
      expect(b.getAttributions("03").id).equals("03");
      expect(b.relativeAt(1, 2)).equals("02");
      expect(b.relativeAt(1, 4)).equals("02");
      expect(b.relativeAt(3, 4)).equals("03");

  })
  it('should be able to expand basket', () => {
    const b = new Basket(simpleBasket)
    expect(b.hasExpansion(2)).is.ok;
    expect(b.hasExpansion(4)).equals("2");
    expect(b.hasExpansion(8)).equals("2");
    const c = b.withExpansion(simpleExpansion)
    expect(c.hasExpansion(2)).is.not.ok;
    expect(c.getAttributions("04").id).equals("04");
    expect(c.relativeAt(1,2)).equals("04");
    expect(c.relativeAt(2,3)).equals("05");
    expect(c.hasExpansion(8)).equals("4");
    expect(c.hasExpansion(4)).equals("4");
  })
})
