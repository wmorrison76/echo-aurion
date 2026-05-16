# Cultural Interpreter

Echo’s cultural interpreter maintains etiquette guidelines, language nuances, and hospitality customs per region. Populate this directory with YAML files such as `jp.yaml` or `fr.yaml` that describe service expectations.

Example schema:

```yaml
locale: fr-FR
service:
  greeting: "Toujours accueillir avec un sourire et un 'Bonsoir' après 18h."
  taboo_topics:
    - "Politique"
    - "Religion"
  tipping_policy: "Service compris"
```

The intent fusion router can load these files to adapt tone and protocols dynamically.
