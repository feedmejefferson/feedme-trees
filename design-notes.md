# Probability and Expected Value

## Foods, Appetites and Tastes

Given a vector space of foods, we will say that an Appetite is a point (or region of the space centered on a point) that changes with respect to time and that a persons Taste is a similar but larger region that changes less over time. 

Supposing a users appetite of `t`, we will hypothesis (postulate for now) that given the choice between two foods `a` and `b`, the user will prefer the point which is closer to `t`. 

Our goal is to find `t` given a series of choices (within our control) and responses from the user. 

For simulation purposes we'll just use a food to represent appetite `t` and we will treat the problem as a search problem. As a user who has a known food in mind, it is my job to guess that food by presenting a number of food pair choices and getting feedback from the user which food looks closer to the one that they have in mind.  `t` may not be a food in our sample set, however our goal is to recommend the nearest neighbor to that food from the sample set.

## Events

* Aab: user chose food `a` over `b` (distance between points AT<BT)
* Bab: user chose food `a` over `b`



## Gradients

Suppose we have a distance function F(p) that tells us distances to point t, then F is a convex downward function with minimum value of 0 at point t. 

If we define G(p) to be the gradient at the point p, then if we know that point `a` is closer than point `b` to point `t` (i.e. F(a)<F(b)), this tells us something about the average gradient across the line `ba` -- specifically that it is negative -- however it does not tell us that the gradient is negative at all points along the line, only that:

	* the average gradient is negative
	* the gradient at point `b` is negative in the direction of `ba`
	* the gradient at the mid point of `ba` is negative in the direction of `a` 
	* (given the assumption of a convex function, I think) the gradient of the hyperplane that bisects `ba` is negative in the direction of `ba` at every point on the plane 

> It's important to recognize that we don't know the magnitude of the gradient, only the general direction (positive or negative). We might be able to infer some general aspect of the magnitude by measuring the time that it takes the user to decide (one would think that it is easier to chose when the gradient is greater and this would likely lead to shorter decision times, but this is a fairly noisy indicator). 
 
As some examples, our gradient across the line from point `b` to point `a` could look like any of the following. Note that at point `b` the gradient must be negative, but that is not necessarily the case at point `a`
 
```
x
xx
xxx
xxxxx
xxxxxxxxx
xxxxxxxxxxxxxxxx
```


```
x
xxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```


```
x
xxxxxxxx
xxxxxxxxxxxxxxxxxxxxxx                      xxxxxx
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```


## System of Linear Innequality

Rather than solving for a system of linear equations, we're talking about solving for a minimum in a system of bound linear innequalities. In this case, we can say that we know that all points along the line `ab` on the `b` side of the midpoint have a negative partial gradient in the direction of `a`. That's the same as saying that the partial derivative is greater than 0. If we have enough of these inequalities, can we solve for a minimum?

## Bounding Balls

I may have missed the point of the `intersection` Ball Tree function. I think I've focused too much on returning singular branches that represented balls rather than taking advantage of intersections. 

Rather than focusing on the branch represented by the ball with a target size that and centroid, I should probably just be looking for a ball with the exact target center and radius. In the case of the former, the nearest branch with the full set size will always be the full ball, in the case of the latter, an intersecting ball with the same radius as the full set, but pruned to a new center that is offset from the original set will not contain the full set of points.

In this case, convergence would be a matter of progressively shrinking the radius of the target intersection.

Another benefit of this approach could be defining a persons more persistent taste as a ball with a center and a radius and their current appetite as a subset of that. I think the key issue to true personalization would be scaling each of the individual dimensions.

## Polytopes, Hyperplanes and Half Spaces

I think I had that last part half right. It kind of worked some of the time and I realized the times it didn't work were when both points `a` and `b` were nearly the same distance from the target point `t`. Initially I addressed this by increasing the radius and pushing it far out on the line between points A and B, but that was just a quick hack/sanity check to see if using a ball instead of a half space really was the problem. It looked like it was, so I've implemented a second intersection function that uses Hyperplanes as Half Space representations -- that is to say, we prune the ball tree to only include the balls that intersect with the halfspace represented by one side of the hyperplane that bisects points A and B. In this case, rather than explicitly stating the inequality, I've lazily gone with support for "greater than" only, and use a nonstandard hyperplane representation with a negative offset to support less than operations.

I'm still looking to see if there really is a way to perform a gradient descent here, but for now it seems like the closest I can come is simply a progressive bisection of the space. Apparently the shape formed by the intersection of these halfspaces is called a _**polytope**_ and calculating the centroid of a polytope is generally a matter of calculating the center of it's vertices. In a 12d space like we're currently working with, it takes the intersection of 12 (non linearly dependendent) hyperplanes to form a point. Assuming the planes don't all intersect at the same point, thus after 12 food choices, we _could_ (assuming the choices formed a convex shape) come to a polytope with solvable vertices and a theoretical center of mass. This ignores that we are already starting with a bounded spherical shape though -- in reality we aren't looking at the intersection of halfspaces, we're looking at the intersection of a halfspaces and a sphere. Our shape is always finite and fully bound and thus has a center of mass.  We could potentially calculate this center of mass, but maybe we're simply better off looking at the centroid of "sampled points" using our actual food samples as those points. In that case, the centroid of those points recalculated as part of the new pruned tree provides us with our current best guess that should converge on the answer. 

This convergence does happen when we have the ideal "oracle" telling us which point is closer, but this will not be the case when real people are clicking on images of food -- partially because the people are capricious and have their own tastes that do not fully match the food space, but also because we accept that our food space is inherently with error. 

> If we accept this, we still need some approach that prevents us from pruning too much of the space too early at risk of removing too much of the valid search space prematurely due to a single bad click. 

## Next Steps

I think the easiest answer to the last question posed is just not to automatically use the halfspace defined by the hyperplane bisecting points A and B, but rather some hyperplane along that line that at the worst prunes as many points as the bisecting plane would. 

As a quick example, suppose we have a sphere with 100 points in it, and we randomly offer two foods near each other and near the boundary of the sphere. Further, let's suppose that the target food is all the way on the other side of the sphere and both points are nearly the same distance to the target point. It is easy to see where a little bit of noise might cause the user to select the "wrong" food -- in reality the user might be thinking, gross, _**"I don't want either of those, gross."**_ In this situation, we could end up pruning half or more of our food space out of our search space, and it is quite likely to be the wrong half. Instead, we might want to choose a hyperplane along the line between A and B that prunes a smaller portion of our search space (even to the point where it might still include the point that the user declined). 

### A Possibly Better Alternative

We can possibly improve upon the scenario specified above by more strategically choosing our food pairings presented to the user. Ideally they would be selected from points far apart in our search space -- that way, even if the have our worst case scenario of both foods being equidistant to the target food, we can still likely choose a halfspace intersection based on a hyperplane that falls between the declined food and the bisection of points A and B, but also limits the rate at which we decrease our search space. 

The trick is coming up with this strategy -- so far I've been playing around with the random strategy. 

Another thought is similar to, but not quite as well formed as the "food cubes" idea I had a while ago. We can generate candidate pairings based on their alignment with our 12 arbitrary (but currently fixed) dimensions. 

In a brute force approach, we can simply generate all of the pairngs -- `O(n^2)` or in our case 256 squared using the 256 mvp foods -- calculate the vector for that pairing as the normalized difference between the two paired food vectors, then take that vectors dot product with each of our 12 dimensions unit vectors. Pairings aligned along a specific dimension will have a dot product close to 1 with that dimension. 

After compiling a list of good pairing candidates based on their alignment, we then just need to break them up into `quadrants` based on the location of their center (the midpoint of the two foods they pair) and their length (the distance between the foods). 

Early on in a search, we would want to draw from pairings that are far apart with a midpoint that's relatively central. As the user clicks on preferred foods and we converge on their target, we will want to draw from progressively smaller pairings located closer to the point of convergence.  