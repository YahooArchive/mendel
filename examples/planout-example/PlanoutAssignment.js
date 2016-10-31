/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   Contributed by Shalom Volchok <shalom@digitaloptgroup.com>
   See the accompanying LICENSE file for terms. */

var Planout = require("planout");

class PlanoutAssignment extends Planout.Experiment {

    configureLogger() {
        return;
    }

    log(/* event */) {
        /*
        The event contains the details of the assignment, as shown in the
        below example. This should be saved for analytics.

        { name: 'GenericExperiment',
          time: 1476884238.671,
          salt: 'GenericExperiment',
          inputs: { visitorId: '8417bb0e-d918-4807-b9a3-0339c6300d4f' },
          params: { layer_1: 'layer_1_bucket_B', layer_2: 'layer_2_bucket_C' },
          event: 'exposure'
        }

        */
    }

    previouslyLogged() {}

    assign(params, args) {
        /*
        Planout uses deterministic hashing to choose assignments. This assures
        that the same visitorId will always get the same selection. In addition to
        the visitorId, Planout concatenates the params name ('layer_1' or 'layer_2')
        with the visitorId to assure that selections are not correlated across params.
        */
        params.set('layer_1', new Planout.Ops.Random.UniformChoice({
                choices: [
                    false, // if selected will show base
                    "layer_1_bucket_A",
                    "layer_1_bucket_B"
                ],
                unit: args.visitorId
            })
        );
        params.set('layer_2', new Planout.Ops.Random.UniformChoice({
                choices:  [
                    false, // if selected will show base
                    "layer_2_bucket_A",
                    "layer_2_bucket_B",
                    "layer_2_bucket_C"
                ],
                unit: args.visitorId
            })
        );
    }

}

module.exports = PlanoutAssignment;
