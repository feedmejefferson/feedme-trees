import { TreeIndex } from "./types";

export class IndexedTree {
    private nodes: TreeIndex;
    // private minIndex: number;
    private maxIndex: number;
    public constructor(tree: TreeIndex) {
        this.nodes=tree;
        this.maxIndex=Object.keys(tree).map(x => parseInt(x)).reduce((x,y) => x>y ? x : y);

    }

    /**
     * Returns the id for the food at this index if it is a food node
     * or undefined if it is a branch or basket node.
     * 
     * @param {number} nodeIndex - the id of the node to get the value of.
     * @returns {string} - the value of the node if it is a terminal/leaf node.
     */
    public get(nodeIndex: number): string {
        return this.nodes[`${nodeIndex}`];
    }
    
    /**
     * Traverses the branch depth first to find the first (left most) 
     * terminal node.
     * 
     * @param {number} nodeIndex - the node/branch to traverse.
     * @returns {string} - the value of this branches first terminal node.
     */
    public getFirst(nodeIndex: number): string {
        for(let i = nodeIndex;i<=this.maxIndex;i*=2) {
            const v = this.get(i);
            if(v) { return v; }
        } 
        return "none"; // TODO: figure out how to best handle missing terminal nodes
        
    }

    /**
     * Bisect the branch to find a terminal node.
     * 
     * @param {number} nodeIndex - the node/branch to bisect.
     * @returns {string} - the value of this branches central most terminal node.
     */
    public getBisect(nodeIndex: number): string {
        const v = this.get(nodeIndex);
        return v ? v : this.getFirst(nodeIndex*2+1);
    }

    /**
     * Traverse the branch using a random seed to find a terminal node. 
     * 
     * @param {number} nodeIndex - the node/branch to bisect.
     * @param {number} seed - a random number between 0 and 1.
     * @returns {string} - the value of this branches central most terminal node.
     */
    public getRandom(nodeIndex: number, seed: number): string {
        const m = -1>>>1; // max positive signed integer -- 0 followed by 31 ones
        const s = seed * Number.MAX_SAFE_INTEGER & m; // must be positive -- 0 followed by random
        let b = nodeIndex;
        let i = b;
        // max shift of 31 starts us off with 0 value, each decrement of 1 
        // doubles the previous value and randomly adds 0 or 1 for a consistent
        // traversal of the tree. This is important because we want pairings
        // that represent the same relative traversals from opposing branches.
        // It's possible that one branch will have to traverse deeper than the
        // other branch, so it's important that both sides consistently traverse
        // each of the branches when using the same seed.
        for(let shift = 30; shift>0 && i<=this.maxIndex; shift--) {
            if(this.get(i)) { return this.get(i); }
            b *= 2;
            i = b + (s>>shift);
        }
        return "none";
        
    }

    public ancestorNodeId(nodeIndex: number): number {
        // tslint:disable-next-line: no-bitwise
        for(let i = nodeIndex;i>1;i>>=1) {
            if(this.get(i)) { return i; }
        } 
        return 0;
    }
    public firstChildNodeId(nodeIndex: number): number {
        for(let i = nodeIndex;i<=this.maxIndex;i*=2) {
            if(this.get(i)) { return i; }
        } 
        return 0;
    }

}
