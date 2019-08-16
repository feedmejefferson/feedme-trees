import * as utils from "./tree-utils";
import { Attribution, BasketExpansion, CoreBasket, TreeIndex } from "./types";

export class Basket {
  public static deserialize(serialized: string) {
    const core = JSON.parse(serialized);
    return new Basket(core);
  }
  private tree: TreeIndex; 
  private attributions: {[key:string]:Attribution};
  private remaining: TreeIndex;
  private maxIndex: number;
  public constructor(core: CoreBasket) {
    this.tree=core.tree;
    this.attributions=core.attributions;
    this.remaining=core.baskets;
    this.maxIndex=Object.keys(this.tree).map(x => parseInt(x)).reduce((x,y) => x>y ? x : y);
  }
  public serialize(): string {
    return JSON.stringify({tree: this.tree, attributions: this.attributions, baskets: this.remaining})
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
    const newRemaining = {...this.remaining};
    delete(newRemaining[expansion.id]);
    return new Basket({tree: newCore, attributions: newAttributions, baskets: newRemaining});
  }
  public branchIsTerminal(branch: number): boolean {
    return !!this.tree[branch];
  }
  public hasExpansion(branch: number): string {
    let expansion=null;
    while(branch>0) {
      if(this.remaining[branch]) { expansion=this.remaining[branch] }
      branch = branch >> 1;
    }
    return expansion;
  }

}