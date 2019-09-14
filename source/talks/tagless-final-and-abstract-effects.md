---
title: Tagless Final and Abstract Effects
date: 2019-09-14 13:32:00
comments: false
---

## Overview

The workshop is made up of practical exercises that introduce the tagless final style, and demonstrate how this style can be used in real world use cases.

The workshop is in two parts. The first is a practical introduction to the concept of "Tagless Final Interpreters" with a simple first order language that can express integer arithmetic. Attendees will implement a simple evaluator for this language in the tagless final style, and show that the final and initial encodings are equivalent.

The second part consists of several exercises that build out a simple reading list application, that allows the storage of users, books and reading lists for each user, using the tagless final style.

The exercises will demonstrate
  - The use of tagless final encoding
  - Composing tagless final algebras
  - Using typeclass constraints to abstract over what capabilities are needed in different scenarios. Including, sequential computations with `cats.Monad`, error handling with `cats.MonadError` and parallelism with `cats.Parallel`


- [flatMap(Oslo) abstract](https://2019.flatmap.no/talks/jordan)
- [Workshop resources](https://github.com/eli-jordan/tagless-final-jam)

