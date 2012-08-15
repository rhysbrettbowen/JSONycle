JSONycle
========

JSON stringify and parse for objects containing cycles

use JSONycle.stringify(object);

it will return an array with two elements. The first is the stringified object and the second are the cycles in the object.

YOu can pass the true parameter to get both bits of information in string form for storing:

JSONycle.stringify(object, true);

to get the object back with the cycles just pass in those two elements to JSONycle.parse(string, cycles)

you can pass in the cycles to parse as the string or the cycles array.

this will return the object with all the cycles still in
