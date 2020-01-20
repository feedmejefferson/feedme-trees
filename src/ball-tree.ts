import { calculateCentroids, distance, knn, knc, intersection as intersect } from "./tree-utils";
import { Ball, Point, TreeLike, LeafNode } from "./types";


export class BallTree {
    private nodes: TreeLike<Ball>;
    // private minIndex: number;
    private maxIndex: number;
    public constructor(tree: TreeLike<Ball>) {
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
    public get(nodeIndex: number): Ball {
        return this.nodes[`${nodeIndex}`];
    }
    
    /**
     * Traverses the branch depth first to find the first (left most) 
     * terminal node.
     * 
     * @param {number} nodeIndex - the node/branch to traverse.
     * @returns {string} - the value of this branches first terminal node.
     */
    public getFirst(nodeIndex: number): Ball {
        for(let i = nodeIndex;i<=this.maxIndex;i*=2) {
            const ball = this.get(i);
            if(ball.weight===1) { return ball }
        }         
    }

    /**
     * Bisect the branch to find a terminal node.
     * 
     * @param {number} nodeIndex - the node/branch to bisect.
     * @returns {string} - the value of this branches central most terminal node.
     */
    public getBisect(nodeIndex: number): Ball {
        const ball = this.get(nodeIndex);
        return (ball.weight===1) ? ball : this.getFirst(nodeIndex*2+1);
    }

    /**
     * Return a random leaf node from the branch specified. The random node
     * returned will be uniformly drawn from the leaf nodes of this branch.
     * 
     * @param {number} nodeIndex - the node/branch to get a random leaf node from.
     * @returns {string} - a random terminal node.
     */
    public getRandom(nodeIndex: number): LeafNode {
        let branch = nodeIndex;
        let weight = this.get(branch).weight;
        while(weight>1) {
            branch=branch*2;
            const lb = this.get(branch);
            if(Math.random()>lb.weight/weight) { 
                branch+=1;
            }
            weight = this.get(branch).weight;
        }
        return this.get(branch) as LeafNode
        
    }

    public ancestorNodeId(nodeIndex: number): number {
        // tslint:disable-next-line: no-bitwise
        for(let i = nodeIndex;i>1;i>>=1) {
            const ball = this.get(i)
            if(ball&&ball.weight===1) { return i; }
        } 
        return 0;
    }
    public firstChildNodeId(nodeIndex: number): number {
        for(let i = nodeIndex;i<=this.maxIndex;i*=2) {
            const ball = this.get(i)
            if(ball.weight===1) { return i; }
        } 
        return 0;
    }
    public nn = (p: Point): LeafNode => {
        return this.nodes[knn(this.nodes, 1, p, 1)[0]] as LeafNode;
    }
    public nc = (p: Point, m: number): number => {
        return knc(this.nodes, 1, p, 1, m)[0];
    }
    public intersection = (ball: Ball): TreeLike<Ball> => {
        return intersect(this.nodes, ball)
    }
}
