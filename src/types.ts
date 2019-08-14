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
    attributions: {[key:string]: Attribution};
}

export interface BasketExpansion {
    tree: TreeExpansion;
    attributions: {[key:string]: Attribution};
}