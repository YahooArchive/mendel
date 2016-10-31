/* Copyright 2015, Yahoo Inc.
   Copyrights licensed under the MIT License.
   Contributed by Shalom Volchok <shalom@digitaloptgroup.com>
   See the accompanying LICENSE file for terms. */

import React from 'react';

export default ({ style }) => {
  return (
        <div style={style}>
            To get a new random assignment from Planout, either delete your cookies or add <a href="/?reset=true">?reset=true</a> to your url.<br/><br/>

            You may also append query parameters to request specific combinations directly from Mendel. In this example the server will not use Planout if the variations parameter is present. Note that in production you most likely do not want this feature, unless it is hidden behind some layer of internal authentication.

            <br/><br/>
            The following is a complete list of all 12 valid combinations.<br/><br/>

            <a href="/?variations=">all from base</a><br/>
            <a href="/?variations=layer_1_bucket_A">layer_1_bucket_A</a><br/>
            <a href="/?variations=layer_1_bucket_B">layer_1_bucket_B</a><br/>
            <a href="/?variations=layer_2_bucket_A">layer_2_bucket_A</a><br/>
            <a href="/?variations=layer_2_bucket_B">layer_2_bucket_B</a><br/>
            <a href="/?variations=layer_2_bucket_C">layer_2_bucket_C</a><br/>
            <a href="/?variations=layer_1_bucket_A,layer_2_bucket_A">layer_1_bucket_A, layer_2_bucket_A</a><br/>
            <a href="/?variations=layer_1_bucket_A,layer_2_bucket_B">layer_1_bucket_A, layer_2_bucket_B</a><br/>
            <a href="/?variations=layer_1_bucket_A,layer_2_bucket_C">layer_1_bucket_A, layer_2_bucket_C</a><br/>
            <a href="/?variations=layer_1_bucket_B,layer_2_bucket_A">layer_1_bucket_B, layer_2_bucket_A</a><br/>
            <a href="/?variations=layer_1_bucket_B,layer_2_bucket_B">layer_1_bucket_B, layer_2_bucket_B</a><br/>
            <a href="/?variations=layer_1_bucket_B,layer_2_bucket_C">layer_1_bucket_B, layer_2_bucket_C</a><br/>
        </div>
    );
}
