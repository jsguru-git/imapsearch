# Searching emails with weighted search.

## search items example
```
[
    {
        "weight": 15,
        "addWeight": {
            "SEEN" : 2,
            "ANSWERED": -3
        },
        "flags": [
            "UNDRAFT", "UNDELETED"
        ],
        "keywords": ["6 janvier 1978", "Conditions Générales de Ventes"]
    },
    {
        "weight": 10,
        "addWeight": {
            "SEEN" : 1
        },
        "flags": [
            "UNDRAFT", "UNDELETED"
        ],
        "keywords": ["Informatique et Libertes", "L121-21", "Informatique et Libertés"]
    }
]
```
Run the following command.

> node imapSearcher.js
