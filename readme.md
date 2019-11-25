# Feedme Trees

This library is intended to support most of the model structures for feed me jefferson. This is not limited to our core binary tree structure, but the binary tree does form a core structure for us and it will require a number of common utility functions that we want to share across different projects. 

## Installation and Usage

We aren't publishing to the standard npm repository, so you'll first have to add the `@feedmejefferson` github scope to your `.npmrc` file.

> While you can probably add this to the `.npmrc` file in your home directory, it's better to add it at the project level for any projects that you intend to share so others can easily run `npm install` without having to add the scope to their home directory.

Now add it like you would any other `npm` dependency:

    npm install --save @feedmejefferson/feedme-trees
 