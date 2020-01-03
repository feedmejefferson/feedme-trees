import { calculateCentroids, distance } from "./tree-utils";
import { Centroid, LeafNode, Point, TreeLike } from "./types";


export class BallTree {
    private nodes: TreeLike<Centroid|LeafNode>;
    // private minIndex: number;
    private maxIndex: number;
    public constructor(tree: TreeLike<Centroid|LeafNode>) {
        this.nodes=tree;
        this.maxIndex=Object.keys(tree).map(x => parseInt(x)).reduce((x,y) => x>y ? x : y);
        calculateCentroids(this.nodes,1);

    }

    /**
     * Returns the id for the food at this index if it is a food node
     * or undefined if it is a branch or basket node.
     * 
     * @param {number} nodeIndex - the id of the node to get the value of.
     * @returns {string} - the value of the node if it is a terminal/leaf node.
     */
    public get(nodeIndex: number): Partial<Centroid & LeafNode> {
        return this.nodes[`${nodeIndex}`];
    }
    
    /**
     * Traverses the branch depth first to find the first (left most) 
     * terminal node.
     * 
     * @param {number} nodeIndex - the node/branch to traverse.
     * @returns {string} - the value of this branches first terminal node.
     */
    public getFirst(nodeIndex: number): LeafNode {
        for(let i = nodeIndex;i<=this.maxIndex;i*=2) {
            const v = this.get(i);
            if(v&&v.id) { return v as LeafNode; }
        }         
    }

    /**
     * Bisect the branch to find a terminal node.
     * 
     * @param {number} nodeIndex - the node/branch to bisect.
     * @returns {string} - the value of this branches central most terminal node.
     */
    public getBisect(nodeIndex: number): LeafNode {
        const v = this.get(nodeIndex);
        return (v && v.id) ? v as LeafNode : this.getFirst(nodeIndex*2+1);
    }

    /**
     * Traverse the branch using a random seed to find a terminal node. 
     * 
     * @param {number} nodeIndex - the node/branch to bisect.
     * @param {number} seed - a random number between 0 and 1.
     * @returns {string} - the value of this branches central most terminal node.
     */
    public getRandom(nodeIndex: number, seed: number): LeafNode {
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
            const v = this.get(i)
            if(v&&v.id) { return v as LeafNode; }
            b *= 2;
            i = b + (s>>shift);
        }
        
    }

    public ancestorNodeId(nodeIndex: number): number {
        // tslint:disable-next-line: no-bitwise
        for(let i = nodeIndex;i>1;i>>=1) {
            const v = this.get(i)
            if(v&&v.id) { return i; }
        } 
        return 0;
    }
    public firstChildNodeId(nodeIndex: number): number {
        for(let i = nodeIndex;i<=this.maxIndex;i*=2) {
            const v = this.get(i)
            if(v&&v.id) { return i; }
        } 
        return 0;
    }

    public nn(p: Point): LeafNode { 
        let nid = 1;
        while(!('id' in this.nodes[nid])) {
            nid=this.nearestChildNodeId(nid, p)
        }
        return this.nodes[nid] as LeafNode;
    }
    private nearestChildNodeId(id: number, point: Point): number {
        const aid = id*2;
        const bid = id*2+1;
        const adist = distance(point,this.nodes[aid]);
        const bdist = distance(point,this.nodes[bid]);
        return adist<bdist ? aid : bid;
    }
}
