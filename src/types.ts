export interface TreeIndex {
    [key:number]:string;
}

export interface BranchExpansion {
    [key:number]:string;
}

export interface TreeExpansion {
    [key:number]:BranchExpansion;
}
