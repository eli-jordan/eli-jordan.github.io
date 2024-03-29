---
title: Life Is A Comonad
date: 2018-02-16 15:30:28
tags: 
- functional-programming
- scala
- comonad
---

I have recently been grappling with the concept of a `Comonad`, and found that there are quite a few articles that explain their theoretical footing, but not many that convey an intuitive understanding of Comonads using practical examples. Additionally, the practical examples I did find are all in Haskell, which I am not fluent in.

In this post I aim to convey an intuitive understanding of the structure of a `Comonad`, and how you can use comonads in real(ish) programs. 

## What Is A Comonad?

A `Comonad` is the [categorical dual](https://en.wikipedia.org/wiki/Dual_%28category_theory%29) of a `Monad`. This simply means that we "reverse the arrows" in the definition of a `Monad`

```scala Monad / Comonad Duality
trait Monad[F[_]] {
   def unit[A](a: A): F[A]
   def join[A](ffa: F[F[A]]): F[A]
}

trait Comonad[F[_]] {
   def counit[A](fa: F[A]): A
   def cojoin[A](fa: F[A]): F[F[A]]
}
```

If we rewrite the types of these functions slightly differently, the reversal of the arrows becomes more obvious.

```scala Reversing The Arrows
unit: A => F[A]
counit: F[A] => A

join: F[F[A]] => F[A]
cojoin: F[A] => F[F[A]]

```

### `unit` / `counit`

- In a `Monad` the `unit` function takes a pure value, and wraps it in an `F` structure `F[A]`
- In a `Comonad` the `counit` function takes an `F` structure and **extracts** a pure value `A`

### `join` / `cojoin`

- In a `Monad	` the `join` function takes two layers of `F` structure `F[F[A]]` and **collapses** it into one layer `F[A]`
- In a `Comonad` the `cojoin` function takes one layer of `F` structure `F[A]` and **duplicates** it `F[F[A]]`


Ok, so now we can see that a `Comonad` is defined by reversing the arrows in the definition of a `Monad`, but this doesn't provide an intuitive understanding of how a `Comonad` behaves.

## The Intuition

The `Zipper` data structure is a good analogy of the behaviour of a `Comonad`. A `Zipper` is a sequence of elements, that encodes the idea of a "current" or "focus" element, allowing the focus to be moved left and right efficiently.

```scala Zipper
case class StreamZipper[A](left: Stream[A], focus: A, right: Stream[A]) {
  def moveLeft: StreamZipper[A] =
    new StreamZipper[A](left.tail, left.head, focus #:: right)

  def moveRight: StreamZipper[A] =
    new StreamZipper[A](focus #:: left, right.head, right.tail)
}
```

The `left` member contains all elements that precede the focus element, in reverse order. The elements are reversed, so that moving left is just a prepend operation. The `right` member contains all elements that follow the focus element.


What does this have to do with `Comonads`? Well, since we have a focus element, we have a way to **extract** an `A` element from an `F[A]`, by simply accessing the focus element. This is exactly what we need to implement `counit`

```scala Counit
implicit object ZipperComonad extends Comonad[StreamZipper] {
  def counit[A](fa: StreamZipper[A]): A = 
    fa.focus
  def cojoin[A](fa: StreamZipper[A]): StreamZipper[StreamZipper[A]] = ???
}
```

But, we still don't have an implementation for `cojoin`. What does it mean to create a `StreamZipper[StreamZipper[A]]`? 

They key insight here, is that we want to generate a `StreamZipper` where each element has the same elements as the initial `StreamZipper` but with the focus shifted.

For example, denoting the focus element using `>x<`

```
cojoin([1, >2<, 3]) = [
   [>1<,  2 ,  3 ], 
   [ 1 , >2<,  3 ], 
   [ 1 ,  2 , >3<]
]
```

So, `cojoin` **duplicates** our structure, but with the focus in each duplicate shifted to one of the other elements. In the `StreamZipper` example this means that for each element we create a duplicate of the entire `StreamZipper` and set the focus on that element.

So lets implement this for `StreamZipper`

```scala StreamZipper cojoin
case class StreamZipper[A](left: Stream[A], focus: A, right: Stream[A]) {
  // ... 
  
  // A stream of zippers, with the focus set to each element on the left
  private lazy val lefts: Stream[StreamZipper[A]] =
    Stream.iterate(moveLeft)(_.moveLeft).zip(left.tail).map(_._1)

  // A stream of zippers, with the focus set to each element on the right
  private lazy val rights: Stream[StreamZipper[A]] =
    Stream.iterate(moveRight)(_.moveRight).zip(right.tail).map(_._1)
    
  lazy val cojoin: StreamZipper[StreamZipper[A]] =
    new StreamZipper[StreamZipper[A]](lefts, this, rights)
}
```

Now defining the `Comonad` instance is trivial

```scala Comonad instance
implicit object ZipperComonad extends Comonad[StreamZipper] {
  def counit[A](fa: StreamZipper[A]): A = 
    fa.focus

  def cojoin[A](fa: StreamZipper[A]): StreamZipper[StreamZipper[A]] = 
    fa.cojoin
}
```

Summarising, a `Comonad` has two operations

- `counit` extracts a focus element from a structure
- `cojoin` extends the structure, so that for every element in the original structure, there is a copy of the structure with the focus on the corresponding element.

## Comonad coflatMap

You may have noticed that the definition of `Monad` that I used is a bit different than how it is normally expressed in scala. In particular, I used `unit` and `join` rather than `unit` and `flatMap`. However, these definitions are equivalent. Taking our definition of monad, we can define `flatMap` in terms of `map` and `join`

```scala Deriving flatMap
trait Monad[F[_]] {
   def unit[A](a: A): F[A]
   def join[A](ffa: F[F[A]]): F[A]
   
   def flatMap[A, B](fa: F[A])(f: A => F[B])(implicit F: Functor[F]): F[B] =
     join(F.map(fa)(f))
}
```

Similarly, for comonad, we can express `coflatMap` in terms of `map` and `cojoin`

```scala Deriving coflatMap
trait Comonad[F[_]] {
  def counit[A](fa: F[A]): A
  def cojoin[A](fa: F[A]): F[F[A]]
   
  def coflatMap[A, B](fa: F[A])(f: F[A] => B)(implicit F: Functor[F]): F[B] =
    F.map(cojoin(fa))(f)
}
```

I used this definition, since the intuition for `cojoin` is easier to understand and describe using the `StreamZipper`. However, the comonad equivalent of `flatMap`, called `coflatMap` is a useful function, and we will need to use it later when implementing the Game Of Life.

This function "extends" a local computation into the global context the comonad holds. If you recall, `cojoin` generates all possible focus points in the comonad structure. In the `StreamZipper` example, this was a zipper of zippers, where each focused on a different element.

If we inspect the derivation of `coflatMap`, we are 

- First using `cojoin` to get a view on all focal points, then
- Using the `Functor` instance to apply a function that performs a "local" computation at all focal points. 

So, `coflatMap` allows us to **extend** a local computation to apply in a global context.

A simple example of this, using the `StreamZipper` is a sliding average. Say we want to take the average of all possible 3 element sub sections of a `StreamZipper[Int]`. We can define a function that calculates the average, using local information only, by calculating the average of the current focus, the focus one move left and one move right.

```scala Local Average
def avg(a: StreamZipper[Int]): Double = {
   val left = a.moveLeft.focus
   val current = a.focus
   val right = a.moveRight.focus
   (left + current + right) / 3d
}
```

We can then "extend" this local computation, using `coflatMap`

```scala
StreamZipper(List(1, 2, 3), 4, List(5, 6, 7)).coflatMap(avg).toList
// List(2.0, 3.0, 4.0, 5.0, 6.0)
```

## Store Comonad

Now that you have a basic understanding of how comonads behave, our next goal is to actually use one to implement a non-trivial program. In this case, since the comonad structure is well suited to cellular automaton, we will implement [Conway's Game Of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life) using the `Store` comonad.

So, lets first introduce the Store data type. `Store` is the comonadic dual of the `State` monad, and takes the following form.

```scala
case class Store[S, A](lookup: S => A)(val index: S)
```

- You can think of `S` being an abstract index into the store.
- The `index` field then defines the "focus" element, by defining the index
- The `lookup` function is the "accessor" for a value of type `A` using an index of type `S`

Lets define the comonad operations on the this data type.

```scala
case class Store[S, A](lookup: S => A)(val index: S) {
  lazy val counit: A = 
    lookup(index)

  lazy val cojoin: Store[S, Store[S, A]] =
    Store(Store(lookup))(index)

  def map[B](f: A => B): Store[S, B] =
    Store(lookup.andThen(f))(index)
}

```

One thing to notice is that `Store` take two type parameters, so to define a `Comonad` instance we need to fix one of them. In this case we fix `S`. 

`counit` is trivial, we simply apply the `lookup` function to the current index.

`cojoin` is more interesting. 

- Since we are fixing `S` we want to generate `Store[S, Store[S, A]]`. 
- Since we are replacing `A` with `Store[S, A]`, and `A` is only used in the return type of `lookup`, we need to define a new `lookup` function of type `S => Store[S, A]`. 
- We do this by partially applying the store constructor `Store(lookup)` since this has exactly the type we need. 
- We then copy the current store, replacing the `lookup` function with a partially applied constructor and we're done.

The intuition that `cojoin` duplicates the structure, with the focus shifted, is a little harder to see in `Store`, but it is still there.

- We can think of `S => A` as an infinite space of `A's` that we index into using `S`.
- If we then consider that `cojoin` duplicates the structure to `Store[S, Store[S, A]]`, so we have `S => Store[S, A]` which is an infinite space of `Store` objects indexed by `S`.
- If we then index into this infinite space of `Store` objects using an `S` we will obtain a `Store[S, A]` with the same structure as our original, but with the focus set to the index used to extract the `Store` instance.

So, for every `A` we could extract from the original `Store` using some `S` we can extract a `Store[S, A]` from the `cojoin`ed store using the same the same `S` and the focus will be defined by the provided `S` index. 

In other words, for every "element" in the original `Store`, we can obtain another `Store` focused on that "element".

## Game Of Life

The game of life is a two-dimensional grid, where each cell is either alive or dead. In each generation a simple set of rules are applied at each cell to determine the next generation.

We will use the `Store` comonad to model the game. The index `S` in our `Store` will be fixed to `(Int, Int)`. This pair of `Int`s will represent x-y coordinates in the grid.

```scala Types
type Coord = (Int, Int)
type Grid[A] = Store[Coord, A]
```

Before we move on to defining the rules of the game, there is one useful combinator specific to `Store` that we will need. 

```scala Experiment
case class Store[S, A](lookup: S => A)(val index: S) {
  // ...
  def experiment[F[_] : Functor](fn: S => F[S]): F[A] = {
    fn(index).map(lookup)
  }
}
```

The `experiment` function allows a functor valued computation to be applied to the current index, to produce a new index wrapped in that functor. Then extracts the focus for the new index.

In our use case the functor `F` will be `List` and we will use `experiment` to get the values of the neighbours of the current cell.

Now lets look at defining the rules of the game of life. We want to define a function with the following signature

```scala
def conway(grid: Grid[Boolean]): Boolean = ???
```

This function, will take the current focus of the `Grid` as the current cell, and apply the rules of the game of life to determine what the value of the focus should be in the next generation. Remember that `Grid[A] = Store[(Int, Int), A]`, so this function fits the shape of the function argument to `coflatMap`, `Store[(Int, Int), Boolean] => Boolean`.

Lets complete the implementation of this function.

```scala
def conway(grid: Grid[Boolean]): Boolean = {
  val neighbours = grid.experiment[List] { case (x, y) => neighbourCoords(x, y) }
  val liveCount = neighbours.count(identity)

  grid.counit match {
    case true if liveCount < 2 => false
    case true if liveCount == 2 || liveCount == 3 => true
    case true if liveCount > 3 => false
    case false if liveCount == 3 => true
    case x => x
  }
}
```

`neighbourCoords` is a helper that calculates the coordinates of all neighbours of a given cell.

```scala Neighbours
def neighbourCoords(x: Int, y: Int): List[Coord] = List(
  (x + 1, y),
  (x - 1, y),
  (x, y + 1),
  (x, y - 1),
  (x + 1, y + 1),
  (x + 1, y - 1),
  (x - 1, y + 1),
  (x - 1, y - 1)
)
```

We use the `experiment` combinator, along with the `neighbourCoords` function to find all the neighbours of the current cell. We then apply the rules, based on the number of live neighbours, to determine the next state of the current cell.

Finally, we just need to extend the local computation `conway` to a global one, using `coflatMap`

```scala Local To Global
def step(grid: Grid[Boolean]): Grid[Boolean] =
  grid.coflatMap(conway)
```

Notice that by leveraging the comonadic structure, we were able to define the rules of the game based on the context local to, or relative to the focus. That is, we only had to define the rules for a given cell, and didn't need to care about how to apply it globally to all cells.

There is one problem with this implementation though, the performance is exponential in the number of generations, since at each step we need to recalculate all previous generations again. The solution to this, is to memoize the lookup function. There is then far less re-computation of previous states.

```scala
case class Store[S, A](lookup: S => A)(val index: S) {
  // ...
  def map[B](f: A => B): Store[S, B] =
    Store(Store.memoize(lookup.andThen(f)))(index)
}
```

## Conclusion

In this post I provided an intuition for comonads, using the `Zipper` data structure as an analogy. I also detailed the `Store` comonad, and how it fits the same intuition. Then used what we have learned about Comonads to implement [Conway's Game Of Life](https://en.wikipedia.org/wiki/Conway%27s_Game_of_Life) using the store comonad. 

I hope you have found this post helpful, and you now have an intuition and practical understanding of Comonads.

## References

- [Source code](https://github.com/eli-jordan/game-of-life-comonad) for this post
- [Haskell implementation of Life](http://chrispenner.ca/posts/conways-game-of-life.html)




				