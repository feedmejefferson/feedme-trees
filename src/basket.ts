import * as utils from "./tree-utils";
import { Attribution, BasketExpansion, CoreBasket, TreeIndex } from "./types";

export class Basket {
  public static deserialize(serialized: string) {
    const core = JSON.parse(serialized);
    return new Basket(core);
  }
  private tree: TreeIndex; 
  private attributions: {[key:string]:Attribution};
  private maxIndex: number;
  public constructor(core: CoreBasket) {
    this.tree=core.tree;
    this.attributions=core.attributions;
    this.maxIndex=Object.keys(this.tree).map(x => parseInt(x)).reduce((x,y) => x>y ? x : y);
  }
  public serialize(): string {
    return JSON.stringify({tree: this.tree, attributions: this.attributions})
  }
  public getAttributions(index: string) {
    return this.attributions[index];
  }
  public relativeAt(branch: number, relativeBranch: number): string {
    return this.tree[utils.relativeAt(this.tree, branch, relativeBranch)];
  }
  public withExpansion(expansion: BasketExpansion): Basket {
    const newCore = utils.expandTree(this.tree, expansion.tree);
    const newAttributions = { ...this.attributions, ...expansion.attributions};
    return new Basket({tree: newCore, attributions: newAttributions});
  }

}