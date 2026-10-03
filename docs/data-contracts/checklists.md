# `public/data/checklists.json`

Read by `<tpa-checklist>`.

```jsonc
{
  "buyer": [                               // any number of lists; the keys become the tabs
    {
      "title": "Get ready to buy",
      "when": "8+ weeks out",
      "items": ["First task", "Second task"],
      "tip": "Optional italic note under the list"
    }
  ],
  "seller": [ /* same shape */ ]
}
```
