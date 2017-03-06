## Planout Assignment Example

This example uses [PlanOut.js](https://github.com/HubSpot/PlanOut.js), a JavaScript-based implementation of Facebook's [PlanOut](http://facebook.github.io/planout/), to provide variation assignments for Mendel. Note this should not be considered a full production implementation of experimentation with Mendel and PlanOut, but rather a simple reference example of combining the two.

The example implements two layers, `layer_1` contains two variations (plus base), and `layer_2` consists of three variations (plus base). These can be seen in `/isomorphic`.

```
├── base
│   ├── components
│   │   ├── app.js
│   │   ├── body.js
│   │   ├── docs.js
│   │   ├── footer.js
│   │   └── header.js
│   └── main.js
└── variations
    ├── layer_1_bucket_A
    │   └── components
    │       └── body.js
    ├── layer_1_bucket_B
    │   └── components
    │       └── body.js
    ├── layer_2_bucket_A
    │   └── components
    │       ├── footer.js
    │       └── header.js
    ├── layer_2_bucket_B
    │   └── components
    │       ├── footer.js
    │       └── header.js
    └── layer_2_bucket_C
        └── components
            ├── footer.js
            └── header.js
```

The script `PlanoutAssignment.js` implements a PlanOut uniform experiment and provides the assignment mechanism for these two layers.

Planout uses deterministic hashing to choose assignments. This assures
that the same visitorId will always get the same selection. In addition to
the visitorId, Planout concatenates each parameter's name, in this case 'layer_1' or 'layer_2', with the visitorId. This assures that selections are not correlated across layers. While this example implements a simple uniform assignment, significantly more complex experimental designs can be created with PlanOut. Detailed examples and documentation can be found on the main [PlanOut](http://facebook.github.io/planout/) repo.

Within this example a `uuid` is generated for each new visitor and saved to a cookie. Provided this cookie remains, PlanOut will continue to assign the same variations.

PlanOut also provides logging of variation assignments. A single assignment will produce an event with the format shown below. By saving these events and passing the visitorID into your general analytics, outcomes can later be correlated with variation assignments.

```
{
    name: 'GenericExperiment',
    time: 1476884238.671,
    salt: 'GenericExperiment',
    inputs: { visitorId: '8417bb0e-d918-4807-b9a3-0339c6300d4f' },
    params: { layer_1: 'layer_1_bucket_B', layer_2: 'layer_2_bucket_C' },
    event: 'exposure'
}
```

To get a new random assignment from Planout, either delete your cookies or add ?reset=true to your url.

You may also append query parameters to request specific combinations directly from Mendel. In this example the server will not use Planout if the variations parameter is present. Note that in production you most likely do not want this feature, unless it is hidden behind some layer of internal authentication.

The following is a complete list of all 12 valid permutations that can result from the two layers implemented in this example.

- all from base
- layer_1_bucket_A
- layer_1_bucket_B
- layer_2_bucket_A
- layer_2_bucket_B
- layer_2_bucket_C
- layer_1_bucket_A, layer_2_bucket_A
- layer_1_bucket_A, layer_2_bucket_B
- layer_1_bucket_A, layer_2_bucket_C
- layer_1_bucket_B, layer_2_bucket_A
- layer_1_bucket_B, layer_2_bucket_B
- layer_1_bucket_B, layer_2_bucket_C

To run this example go to it's root directory and run `npm install`.

For Mendel 1.x, you can run:

    $ npm run build
    $ npm run development

*TBD: We should add .mendelrc_v2 file and update package.json for this example.*

And view in your browser at `localhost:3000`
