import { Ball, Centroid, Hyperplane, LeafNode, Point, SplitTree, TreeExpansion, TreeIndex, TreeLike } from "./types";

export const MAX_DEPTH = 29;
export const MAX_INDEX = (1 << (MAX_DEPTH + 1)) -1;
export const BISECT_LEFT = ~ (5 << 29)    // one then zero then 29 ones
export const BISECT_RIGHT = 3 << (MAX_DEPTH - 1); // two ones followed by 29 zeroes
const RANDOM_OR_MASK = 1 << 30;
const RANDOM_AND_MASK = (1 << 31) - 1;
const MAX_POSITIVE = -1>>>1; // max positive signed integer -- 0 followed by 31 ones 

/**
 * Checks if a branch is valid -- as in it has full coverage and no missing t
 * terminal nodes. This could be an expensive operation for large branches, so 
 * you probably don't want to run it too often. It's probably good to use this 
 * for validating trees when we build them as static files though.
 * 
 * @param {TreeIndex} t the tree to validate
 * @param {number} b the branch of the tree to validate 
 * @returns {boolean} if the branch is valid
 */

const validateBranch = (t: TreeLike<any>, b: number): boolean => {
  // pass if the branch is a node in the tree
  if (t[b]) {
    return true;
  }
  // fail if we've exceeded the max depth
  if(b>MAX_INDEX) {
    return false;
  }
  // check both of the sub branches recursively
  return(validateBranch(t,b*2) && validateBranch(t,b*2+1));
}

export const validateTree = (t: TreeLike<any>): boolean => {
  // check if the root branch is valid
  return validateBranch(t,1);
}

/**
 * Expands a tree index by replacing each of the expanded branches with 
 * the new nodes specified in the tree expansion.
 * 
 * @param {TreeIndex} t the tree to expand
 * @param {TreeExpansion} tx an associative list of branches with their 
 * expansions
 * @return {TreeIndex} an expanded tree index object
 */
export const expandTree = (t: TreeIndex, tx: TreeExpansion): TreeIndex => {
  const expanded = {...t};
  for(const bx in tx) {
    if(!tx.hasOwnProperty(bx)) { continue }
    delete expanded[bx];
    for(const b in tx[bx]) {
      if(!tx[bx].hasOwnProperty(b)) { continue }
      expanded[b]=tx[bx][b];
    }
  }
  return expanded;
}

export const maxDepth = (t: TreeLike<any>, b: number): number => {
  if (t[b] || b>MAX_INDEX) {
    return 0;
  }
  return(Math.max(maxDepth(t,b*2)+1, maxDepth(t,b*2+1)+1));
}

export const depth = (b: number): number => Math.floor(Math.log2(b));

export const ancestor = (t: TreeLike<any>, b: number): number => {
  while(b>0) {
    if(t[b]) { return b }
    b = b >> 1;
  }
}

export const relativeAt = (t: TreeLike<any>, b: number, rb: number): number => {
  // we can't mod something with 0, so we have to use a minimum depth of 1
  // this will mean treating rb=0 the same as 2 and rb=1 the same as 3.
  const d = Math.max(depth(rb), 1);
  let n = b;
  for(let i = 1; n<=MAX_INDEX && i<=MAX_DEPTH+1; i++) {
    if (t[n]) { return(n) }
    const shift = i % d; 
    n *= 2;
    n = n + ((rb>>((d-shift)%d)) & 1);
  }
  return null;
}

export const bisectRight = (t: TreeLike<any>, b: number): number => {
  return relativeAt(t,b,BISECT_RIGHT);
}

export const bisectLeft = (t: TreeLike<any>, b: number): number => {
  return relativeAt(t,b,BISECT_LEFT);
}

export const seededRandom = (t: TreeLike<any>, b: number, s: number) => {
  const masked = s & RANDOM_AND_MASK | RANDOM_OR_MASK;
  return relativeAt(t,b,masked);
}

export const getRandomSeed = (): number => {
  return Math.random() * Number.MAX_SAFE_INTEGER & RANDOM_AND_MASK | RANDOM_OR_MASK;
}

export function branchNodes<T>(t: TreeLike<T>, b: number): TreeLike<T> {
  if (t[b]) {
    const r = {};
    r[b]=t[b];
    return r;
  }
  const lb = branchNodes(t,b*2);
  const rb = branchNodes(t,b*2+1);
  return{...lb, ...rb};
}

const buildBranch = (t: TreeIndex, b: number, d: number): TreeIndex => {
  const start = b << d; // times 2^d
  const end = start + (1 << (d)); // start plus 2^d
  const core = {}
  for(let i = start;i<end;i++) {
    if(t[i]) { 
      core[i]=t[i]
    } else if(ancestor(t,i)) {
      const a = ancestor(t,i);
      core[a]=t[a]
    } else {
      core[i] = t[relativeAt(t,i,0)]
    }
  }
  return core;
}

const buildBasket = (t: TreeIndex, b: number, e: number, f: number): TreeExpansion => {
  const start = b << e; // times 2^e
  const end = start + (1 << e); // start plus 2^(e-1)
  const basket = {}
  for(let i = start;i<end;i++) {
    if(ancestor(t,i)) { continue } // we don't need to expand this branch
    const branch = buildBranch(t, i, f);
    basket[i]=branch;
  }
  return basket;
}

/**
 * Splits a full tree index up into a smaller representation of the tree
 * followed by a number of expansion baskets. The return value includes 
 * the key `core` with the minimimized representation of the full index, as
 * well as numeric keys indicating branches at which point the tree can 
 * be expanded using @see #expandTree. Note, @see TreeExpansion objects
 * should only be applied after the application of any ancestor node 
 * expansions.
 * 
 * **Note**, this is an initial implementation that is subject to change.
 * In particular, the relationship between depth and frequency and how
 * they are specified has likely room for improvement. Expansion size
 * probably makes more sense, but depth was easier to reason through for
 * a first attempt.  
 * 
 * @param {TreeIndex} t the `tree` to be split 
 * @param {number} e the `eagerness` or depth at which baskets should look 
 * forward when expanding branches.
 * @param {number} f the `frequency` with which the tree should be expanded
 * @param {number} s a number indicating `strategy` to use for selecting 
 * representative nodes for collapsed branches. The number indicates the
 * relative sub branch of the collapsed branch that should be searched to 
 * find a represetative child node. @see #relativeAt
 * 
 * @return {SplitTree} a separated and expandable tree
 */
export const splitTree = (t: TreeIndex, e: number, f=1): SplitTree => {
  const core = buildBranch(t,1,e);
  const split = {core};
  const maxIndex = Object.keys(t)
    .map(x=>parseInt(x))
    .reduce((p,c)=>Math.max(p,c));
  const maxBasket = maxIndex >> (e+f-1);  // we should never have to go deeper 
  for(let b=1;b<=maxBasket;b++) {
    const basket = buildBasket(t, b, e, f)
    if(Object.keys(basket).length>0) {
      split[b]=basket;
    }
    if(!(b & (b+1))) { // b+1 is an exact power of 2
      /* 
      this is a bit convoluted, but we only want to build baskets where
      the branch depth is a multiple of the frequency. If the 
      frequency is one, we basically have to build expansions
      for every branch until the last one. For frequency of two, 
      we need to build them for branches 1, then 4-7, then skip 16-31, then
      64-127... To do this, we're running a simple loop that increments 
      the branch by one every cycle, but when it reaches the end of that
      cycle (depth) it will be one less than an exact power of two,
      so we add one bringing it to that power of two, shift it by the 
      frequency minus one (running through the last) set of branches has 
      already shifted it by one, and subtract one (which will be added
      back in at the next increment of the for loop). Note, if the frequency
      is 1, this does nothing. 
      */ 
      b=((b+1)<<(f-1))-1; 
    } 

  }

  return split;
}

export const NULL_BALL = { radius: 0, center: [], centroid: [], weight: 0}

export const asBall = (p: Point): Ball => (
  { center: p, radius: 0, centroid: p, weight: 1 }
)

export const times = (p: Point, n: number): Point => p.map(px=>n*px) 
export const plus = (p1: Point, p2: Point): Point => p1.map((p1x,i)=>p1x+p2[i])
export const dot = (p1: Point, p2: Point): number => p1.map((p1x,i)=>p1x*p2[i]).reduce((acc,x)=>acc+x)
// euclidean L2 distance
export const distance = (a: Point, b: Point): number => {
//  const sumOfSquares = a.map((avi,i)=>(Math.pow(avi - b[i],2))).reduce((acc,n)=>(acc+n),0)
//  return Math.sqrt(sumOfSquares);
  const h = difference(a,b)
  return Math.sqrt(dot(h,h))
}

// vector subtraction
export const difference = (a: Point, b: Point): Point => a.map((ai,i)=>ai - b[i])

// average of two vectors (with optional weights for weighted average)
export const mean = (p1: Point, p2: Point, w1?: number, w2?: number) => {
  if(w1 && w2) {
    return p1.map((c,i)=>((c * w1 + p2[i] * w2) / (w1+w2)));
  }
  return p1.map((c,i)=>(c + p2[i])/2)
}

export const containerBall = (b1: Ball, b2: Ball): Ball => {
  const weight = b1.weight + b2.weight;
  const centroid = b1.centroid.map((c,i)=>((c * b1.weight + b2.centroid[i] * b2.weight) / weight));
  /*
  This is just some basic geometry. The new center is the midpoint of the diameter
  formed by the line passing through each of the two contained balls centers
  and extending each balls radius outward to the new balls outer wall -- thus
  the diameter is the distance between the two centers plus each of the respective
  radii and the bounding balls radius is half of that. If B is the line between 
  the two contained ball centers, then b1w/b2w is the ratio of the distance between
  the new center and one of the old centers to the distance from the new center to
  the other old center. Its easier to calculate these scalar values once and
  use them to find the new center as a weighted average of the old centers than
  to calculate the new end points and average them. 
  */
  const A = b1.radius;
  const B = distance(b1.center,b2.center);
  const C = b2.radius;
  const radius = (A + B + C)/2;
  /*
  If one of the balls is completely contained by the other ball, we should just
  return the center and radius of the larger ball. This should also account for
  divide by zero errors caused by overlapping centers -- because one of the balls
  completely contains the other (or is the same as)
  */
  const minRadius = A>C ? A : C;
  if(minRadius>=radius) {
    return { weight, centroid, radius: minRadius, center: A>C ? b1.center : b2.center }
  }

  const b1w = radius - A;
  const b2w = radius - C;
  const center = mean(b1.center, b2.center, b2w, b1w);
  // b1.center.map((c,i)=>((c * b2w + b2.center[i] * b1w) / B));
  return { weight, centroid, radius, center }
}

/* 
We're drawing from two random pools -- each pool has an average (expected) value of it's centroid, 
so if continued to draw from the two pools over a long time, and if the person _always_ pulled from
the same pool, then we would want to say our best guess at their appetite was that pools centroid. 
The centroid of the branch that contains those two sub branch centroids is centered around the average
of both pools, so for the trunk (branch 1) it conveniently provides us with an origin. However as 
we progress down branches, the center of the pool changes, so we should actually be treating our new
centroid as the "origin". Each choice should provide an incremental appetite contribution of:
    1/2(chosen-notChosen) + centroid 
Previously I was getting this by adding an extra chosen (1.2*chosen-.2*notChosen) which automatically
added the origin back in, but it's always adding the origin, and when our pools aren't randomly distributed
around the same origin, that doesn't make sense. As we progress to new pools, the origin should change, so
taking the difference between the two foods automatically removes any bias towards an origin, taking half
gives us a value that is on average normalized to the size of a single food offset (or should I not be
halving this?) and then adding in the current centroid removes the bias that pulling from a distribution 
surrounding that centroid added in. 
*/
// export const accumulator = (start: Point) => {
//   let bestGuess = start;
//   const likes: Point[] = [];
//   const dislikes: Point[] = [];
//   const differences: Point[] = [];
//   return {
//     accumulate: (prefer: Point, decline: Point, pDrawnFrom: Ball, dDrawnFrom: Ball) => {
//       // const unnormalized = difference(prefer,decline)
//       // const length = dot(unnormalized,unnormalized)
//       // const unit = length>0 ? times(unnormalized, 1/length) : unnormalized; 
//       // const weighted = times(unit,pDrawnFrom.radius)
//       // bestGuess = mean(bestGuess,weighted)
// //      bestGuess = plus(bestGuess,difference(prefer,decline))
//       bestGuess=mean(bestGuess,difference(times(prefer,2),decline),9,1);
// //      bestGuess = plus(pDrawnFrom.centroid,weighted)
//       likes.push(prefer);
//       dislikes.push(decline);
//       differences.push(mean(pDrawnFrom.centroid, dDrawnFrom.centroid));
//       // bestGuess = mean(bestGuess, x, 1, 2)  // average the new location with the decayed old location
//     },
//     convergence: () => bestGuess,
//     history: () => likes
//   }
// }
export const getHalfspace = (prefer: Point, decline: Point): Hyperplane => {
  const v = difference(prefer,decline);
  const l = Math.sqrt(dot(v,v))
  const n = times(v,1/l)
  const a = mean(prefer,decline,2,3)
  const d = dot(a,n)
  return { normal: n, offset: d } 
}

export const accumulator = (tree: TreeLike<Ball>) => {
  const t = tree;
  let intersect = t;
  const likes: Point[] = [];
  const dislikes: Point[] = [];
  return {
    accumulate: (prefer: Point, decline: Point) => {
      likes.push(prefer);
      dislikes.push(decline);
      // const ab = difference(prefer,decline)
      // const length = Math.sqrt(dot(ab,ab))
      // const radius = intersect[1].radius
//      const radius = t[1].radius
//      const center = plus(mean(prefer, decline),times(ab,128*radius/length))
//      const center = plus(mean(prefer, decline, 1, 2),times(ab,radius/length))
//      const center = plus(mean(prefer, decline),times(ab,radius/length))
//      console.log(distance(center,intersect[1].center), radius)
//      const ball = {center,radius: 128*radius,centroid:center,weight:0}
      const h = getHalfspace(prefer,decline)
      intersect = pruneHalfspace(intersect,h)
      // bestGuess = mean(bestGuess, x, 1, 2)  // average the new location with the decayed old location
    },
    convergence: () => intersect ,
    history: () => likes
  }
}

// old
//
// export const accumulate = (a: {v: number[], path: number[], w: number}, p: Point, b: number) => {
//   const w = a.w + 1;
//   const sumOfSquares = p.v.map((x)=>(Math.pow(x,2))).reduce((acc,n)=>(acc+n),0)
//   const length = Math.sqrt(sumOfSquares);
//   const unitVector = p.v.map(x=>x/length)  
//   const factor = Math.pow(2, -.1*a.path.length) * .05
// //  const factor = .03 * (20/(20-a.path.length)) // 1/(2*(a.path.length+1))
//   const v = a.v.map((avi,i)=>avi + (unitVector[i]*factor));
//   const path = [...a.path,b]
//   return { w, v, path }
// }


// const nearestChildBranch = (t: TreeLike<Centroid|LeafNode>, b: number, p: Point): number => {
//   const lb = b*2;
//   const rb = lb+1;
//   const lp = t[lb]
//   const rp = t[rb]
//   const ldist = distance(p,lp);
//   const rdist = distance(p,rp);
// //  console.log(lb, rb, ldist, rdist, distance(lp,rp), (lp as Centroid).r, (rp as Centroid).r, (lp as Centroid).w, (rp as Centroid).w)
//   return ldist<rdist ? lb : rb;
// }
// export const nearestBranch = (t: TreeLike<Centroid|LeafNode>, b: number, p: Point, d: number) => { 
//   let nid = b;
//   let count = 0;
//   while(count < d && !('id' in t[nid])) {
//       nid=nearestChildBranch(t, nid, p)
//       count++
//   }
//   return nid;
// }

const ballsIntersect = (b1: Ball, b2: Ball): boolean => {
  return distance(b1.center,b2.center) <= b1.radius + b2.radius
} 
export const bisectPoints = (p1: Point, p2: Point): Hyperplane => {
  const v = difference(p1,p2);
  const l = Math.sqrt(dot(v,v))
  const n = times(v,1/l)
  const a = mean(p1,p2)
  const d = dot(a,n)
  return { normal: n, offset: d } 
}

/*
Returns true if the ball intersects the halfspace represented by all points
greater than the hyperplane specified. For intersections of the other halfspace
simply use the negative form of the hyperplane -- negative offsets will always
include the origin, positive offsets always exclude the origin.
*/
export const intersectsHalfspace = (b: Ball, h: Hyperplane): boolean => {
  return dot(b.center,h.normal) > h.offset-b.radius;
}
export const intersectingBranches = (t: TreeLike<Ball>, branch: number, ball: Ball): number[] => {
  if(!t[branch] || !ballsIntersect(t[branch],ball)) { return [] }
  const lb = branch * 2;
  const rb = lb + 1;
  const branches = intersectingBranches(t,lb,ball).concat(intersectingBranches(t,rb,ball))
  return branches.length > 0 ? branches : [branch]
}
/* 
TODO: Note, using intersections kind of implies that we are moving away from
caring about directly addressable branches (at least in the case where we're)
collapsing them. We could probably make this more efficient by simply dropping 
our indexed tree approach and going back to a basic linked list style node tree. 
In that case rather than cloning and rebuilding the deep object tree, for
situations where we don't need to collapse the branch we can just return the
original. (as long as we treat the branches as read only)
*/
const pruneBranch = (ball: Ball, source: TreeLike<Ball>, target: TreeLike<Ball>, sourceBranch: number, targetBranch: number): Ball => {
  /* 
  If we're here this is either a leaf node, or at least one of the 
  subbranches has to intersect.  If one subbranches doesn't, we want to 
  collapse the one that does.
  */

  if(source[sourceBranch].weight===1) {
    // this is a leaf node, add it to the target tree
    target[targetBranch]={...source[sourceBranch]}
    return target[targetBranch];
  }

  // not a leaf node, check if we need to collapse it  
  const lb = sourceBranch * 2;
  const rb = lb + 1;
  const left = ballsIntersect(ball, source[lb])
  const right = ballsIntersect(ball, source[rb])
 
  if(!right) {
    // collapse left
    pruneBranch(ball, source, target, lb, targetBranch)
    return target[targetBranch];
  }
  if(!left) {
    // collapse right
    pruneBranch(ball, source, target, rb, targetBranch)
    return target[targetBranch];
  }
  // prune both branches and calculate new centroid
  const leftBall = pruneBranch(ball, source, target, lb, targetBranch*2)
  const rightBall = pruneBranch(ball, source, target, rb, targetBranch*2+1)
  target[targetBranch] = containerBall(leftBall,rightBall)
  return target[targetBranch]
}

export const intersection = (t: TreeLike<Ball>, ball: Ball): TreeLike<Ball> => {
  const pruned: TreeLike<Ball> = {}
  pruneBranch(ball, t, pruned, 1, 1)
  return pruned;
}

const pruneHalfspaceR = (h: Hyperplane, source: TreeLike<Ball>, target: TreeLike<Ball>, sourceBranch: number, targetBranch: number): Ball => {
  /* 
  If we're here this is either a leaf node, or at least one of the 
  subbranches has to intersect.  If one subbranches doesn't, we want to 
  collapse the one that does.
  */

  if(source[sourceBranch].weight===1) {
    // this is a leaf node, add it to the target tree
    target[targetBranch]={...source[sourceBranch]}
    return target[targetBranch];
  }

  // not a leaf node, check if we need to collapse it  
  const lb = sourceBranch * 2;
  const rb = lb + 1;
  const left = intersectsHalfspace(source[lb], h)
  const right = intersectsHalfspace(source[rb], h)
 
  if(!right) {
    // collapse left
    pruneHalfspaceR(h, source, target, lb, targetBranch)
    return target[targetBranch];
  }
  if(!left) {
    // collapse right
    pruneHalfspaceR(h, source, target, rb, targetBranch)
    return target[targetBranch];
  }
  // prune both branches and calculate new centroid
  const leftBall = pruneHalfspaceR(h, source, target, lb, targetBranch*2)
  const rightBall = pruneHalfspaceR(h, source, target, rb, targetBranch*2+1)
  target[targetBranch] = containerBall(leftBall,rightBall)
  return target[targetBranch]
}

export const pruneHalfspace = (t: TreeLike<Ball>, h: Hyperplane): TreeLike<Ball> => {
  const pruned: TreeLike<Ball> = {}
  pruneHalfspaceR(h, t, pruned, 1, 1)
  return pruned;
}

export const randomLeaf = (t: TreeLike<Ball>, b?: number): LeafNode => {
  let branch = b ? b : 1;
  let weight = t[branch].weight;
  while(weight>1) {
      branch=branch*2;
      const lb = t[branch];
      if(Math.random()>lb.weight/weight) { 
          branch+=1;
      }
      weight = t[branch].weight;
  }
  return t[branch] as LeafNode
  
}


interface Candidate {
  branch: number;
  distance: number;
}
type PriorityQueue = Candidate[];
const compareCandidates = (a: Candidate, b: Candidate) => a.distance - b.distance;
const knnr = (t: TreeLike<Ball>, b: number, p: Point, k: number, q: PriorityQueue): PriorityQueue => { 

  const thisBall = t[b]
  const dist = distance(p,thisBall.center) - thisBall.radius; // negative if p is inside balls wall

  // if the priority queue is full and the point is outside of this ball and
  // the furthest member (the last one) in the queue is closer than the edge 
  // of this ball, then don't search this ball and just return the queue as is
  if(q.length >= k && q[k-1].distance < dist) { return q }

  // if this is a leafnode, add it to the queue, sort the queue, splice and return it
  if(thisBall.weight === 1) {
    q.push({ distance: dist, branch: b })
    q.sort(compareCandidates)
    q.splice(k)
    return q;
  }
  
  // search the child branches recursively always starting with the closer one
  const lb = b*2;
  const rb = lb+1;
  const closer = distance(p,t[lb].center) < distance(p,t[rb].center) ? lb : rb;
  const farther = closer === lb ? rb : lb;
  knnr(t, closer, p, k, q)
  knnr(t, farther, p, k, q)
  return q;
}
export const knn = (t: TreeLike<Ball>, b: number, p: Point, k: number): number[] => {
  return knnr(t, b, p, k, []).map(c=>c.branch);
}

/*
find the K largest balls with weight less than 'm' but more than m/2
in order of distance to centroid (from point p)
*/
const kncr = (t: TreeLike<Ball>, b: number, p: Point, k: number, m: number, q: PriorityQueue): PriorityQueue => { 

  const thisBall = t[b]
  const dist = distance(p,thisBall.center) - thisBall.radius; // negative if p is inside balls wall

  // if the priority queue is full and the point is outside of this ball and
  // the furthest member (the last one) in the queue is closer than the edge 
  // of this ball, then don't search this ball and just return the queue as is
  if(q.length >= k && q[k-1].distance < dist) { return q }

  // if this branch is too small, skip it
  if(thisBall.weight < m/2) { return q }

  // if this branch is small enough (but not too small) add it to the queue, 
  // sort the queue, splice and return it
  if(thisBall.weight <= m) {
    q.push({ distance: distance(p,thisBall.centroid), branch: b })
    q.sort(compareCandidates)
    q.splice(k)
    return q;
  }
    
  // search the child branches recursively always starting with the closer one
  const lb = b*2;
  const rb = lb+1;
  const closer = distance(p,t[lb].center) < distance(p,t[rb].center) ? lb : rb;
  const farther = closer === lb ? rb : lb;
  kncr(t, closer, p, k, m, q)
  kncr(t, farther, p, k, m, q)
  return q;
}
export const knc = (t: TreeLike<Ball>, b: number, p: Point, k: number, m: number): number[] => kncr(t, b, p, k, m, []).map(c=>c.branch);


export const calculateCentroids = (t: TreeLike<Ball>, b: number): Ball => {
  // if the branch exists, return it (it's either a leaf node or it's already built)
  if (t[b]) {
    return t[b];
  }
  // fail if we've exceeded the max depth -- return an empty centroid
  if(b>MAX_INDEX) {
    return NULL_BALL;
  }
  // calculate both of the sub branches recursively
  const lb = b*2;
  const rb = lb+1;
  const left = calculateCentroids(t,lb);
  const right = calculateCentroids(t,rb);
  if(left===NULL_BALL || right===NULL_BALL) {return NULL_BALL}
  const ball = containerBall(left,right);
  t[b] = ball;
  return ball;
}
