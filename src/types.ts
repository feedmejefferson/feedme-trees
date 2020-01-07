export interface TreeLike<T> {
    [key:number]:T;
}

export interface TreeIndex extends TreeLike<string> {}

export interface TreeExpansion extends TreeLike<TreeLike<string>> {}

export interface SplitTree extends TreeLike<TreeExpansion> {
    core: TreeIndex;
}

export interface Attribution  {
    id: string;
    title: string;
    originTitle: string;
    originUrl: string;
    author?: string;
    authorProfileUrl?: string;
    license: string;
    licenseUrl: string;
}

export interface CoreBasket {
    tree: TreeIndex;
    baskets: TreeIndex;
    attributions: {[key:string]: Attribution};
}

export interface BasketExpansion {
    id: string;
    tree: TreeExpansion;
    attributions: {[key:string]: Attribution};
}

export interface Point {
    v: number[];  // the points location (a vector)
}
export interface LeafNode extends Point {
    id: string;
}
export interface Centroid extends Point {
    w: number;  // the centroids weight (or node count)
    r?: number;
}