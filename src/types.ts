export interface TreeLike<T> {
    [key:number]:T;
}

export interface TreeIndex extends TreeLike<string> {}

export interface TreeExpansion extends TreeLike<TreeLike<string>> {}

export interface SplitTree extends TreeLike<TreeExpansion> {
    core: TreeIndex;
}