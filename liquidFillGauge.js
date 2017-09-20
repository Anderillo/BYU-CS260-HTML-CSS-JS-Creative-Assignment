function liquidFillGaugeDefaultSettings(){
    return {
        minValue: 0, // The gauge minimum value.
        maxValue: 100, // The gauge maximum value.
        circleThickness: 0.15, // The outer circle thickness as a percentage of it's radius.
        circleFillGap: 0, // The size of the gap between the outer circle and wave circle as a percentage of the outer circles radius.
        circleColor: "#808015", // The color of the outer circle.
        waveHeight: 0.05, // The wave height as a percentage of the radius of the wave circle.
        waveCount: 3, // The number of full waves per width of the wave circle.
        waveRiseTime: 1000, // The amount of time in milliseconds for the wave to rise from 0 to it's final height.
        waveAnimateTime: 1000, // The amount of time in milliseconds for a full wave to enter the wave circle.
        waveColor: "#AAAA39", // The color of the fill wave.
        waveOffset: 0.25, // The amount to initially offset the wave. 0 = no offset. 1 = offset of one full wave.
        textVertPosition: .8, // The height at which to display the percentage text withing the wave circle. 0 = bottom, 1 = top.
        textSize: 0.75, // The relative height of the text to display in the wave circle. 1 = 50%
        displayPercent: true, // If true, a % symbol is displayed after the value.
        textColor: "#555500", // The color of the value text when the wave does not overlap it.
        waveTextColor: "#FFFFAA" // The color of the value text when the wave overlaps it.
    };
}

function loadLiquidFillGauge(elementId, value) {
    config = liquidFillGaugeDefaultSettings();

    var gauge = d3.select("#" + elementId);
    var radius = Math.min(parseInt(gauge.style("width")), parseInt(gauge.style("height")))/2;
    var locationX = parseInt(gauge.style("width"))/2 - radius;
    var locationY = parseInt(gauge.style("height"))/2 - radius;
    var fillPercent = Math.max(config.minValue, Math.min(config.maxValue, value))/config.maxValue;
    var waveHeightScale = d3.scale.linear().range([config.waveHeight,config.waveHeight]).domain([0,100]);

    var textRounder = function(value) {return Math.round(value);};
    var textPixels = (config.textSize * radius / 2);
    var textStartValue = 0;
    var textFinalValue = parseFloat(textRounder(value));
    var circleThickness = config.circleThickness * radius;
    var circleFillGap = config.circleFillGap * radius;
    var fillCircleMargin = circleThickness + circleFillGap;
    var fillCircleRadius = radius - fillCircleMargin;
    var waveHeight = fillCircleRadius * waveHeightScale(fillPercent * 100);

    var waveLength = fillCircleRadius * 2 / config.waveCount;
    var waveClipCount = 1 + config.waveCount;
    var waveClipWidth = waveLength * waveClipCount;

    // Data for building the clip wave area.
    var data = [];
    for(var i = 0; i <= 40 * waveClipCount; i++) data.push({x: i / (40 * waveClipCount), y: (i / 40)});

    // Scales for drawing the outer circle.
    var gaugeCircleX = d3.scale.linear().range([0, 2 * Math.PI]).domain([0, 1]);
    var gaugeCircleY = d3.scale.linear().range([0, radius]).domain([0, radius]);

    // Scales for controlling the size of the clipping path.
    var waveScaleX = d3.scale.linear().range([0, waveClipWidth]).domain([0, 1]);
    var waveScaleY = d3.scale.linear().range([0, waveHeight]).domain([0, 1]);

    // Scales for controlling the position of the clipping path.
    var waveRiseScale = d3.scale.linear().range([(fillCircleMargin+fillCircleRadius*2+waveHeight),(fillCircleMargin-waveHeight)]).domain([0, 1]);
    var waveAnimateScale = d3.scale.linear().range([0, waveClipWidth-fillCircleRadius*2]).domain([0, 1]);

    // Scale for controlling the position of the text within the gauge.
    var textRiseScaleY = d3.scale.linear().range([fillCircleMargin+fillCircleRadius*2,(fillCircleMargin+textPixels*0.7)]).domain([0,1]);

    // Center the gauge within the parent SVG.
    var gaugeGroup = gauge.append("g").attr('transform', 'translate(' + locationX + ',' + locationY + ')');

    // Draw the outer circle.
    var gaugeCircleArc = d3.svg.arc().startAngle(gaugeCircleX(0)).endAngle(gaugeCircleX(1)).outerRadius(gaugeCircleY(radius)).innerRadius(gaugeCircleY(radius-circleThickness));
    gaugeGroup.append("path").attr("d", gaugeCircleArc).style("fill", config.circleColor).attr('transform','translate('+radius+','+radius+')');

    // Text where the wave does not overlap.
    var text1 = gaugeGroup.append("text").text("0%").attr("class", "liquidFillGaugeText").attr("text-anchor", "middle").attr("font-size", textPixels + "px")
                    .style("fill", config.textColor).attr('transform', 'translate(' + radius + ',' + textRiseScaleY(config.textVertPosition) + ')');

    // The clipping wave area.
    var clipArea = d3.svg.area()
        .x(function(d) {return waveScaleX(d.x);})
        .y0(function(d) {return waveScaleY(Math.sin(Math.PI*2*config.waveOffset*-1 + Math.PI*2*(1-config.waveCount) + d.y*2*Math.PI));})
        .y1(function(d) {return (fillCircleRadius*2 + waveHeight);});
    var waveGroup = gaugeGroup.append("defs").append("clipPath").attr("id", "clipWave" + elementId);
    var wave = waveGroup.append("path").datum(data).attr("d", clipArea).attr("T", 0);

    // The inner circle with the clipping wave attached.
    var fillCircleGroup = gaugeGroup.append("g").attr("clip-path", "url(#clipWave" + elementId + ")");
    fillCircleGroup.append("circle").attr("cx", radius).attr("cy", radius).attr("r", fillCircleRadius).style("fill", config.waveColor);

    // Text where the wave does overlap.
    var text2 = fillCircleGroup.append("text").text("0%").attr("class", "liquidFillGaugeText").attr("text-anchor", "middle").attr("font-size", textPixels + "px")
                    .style("fill", config.waveTextColor).attr('transform','translate('+radius+','+textRiseScaleY(config.textVertPosition)+')');

    // Make the wave rise. wave and waveGroup are separate so that horizontal and vertical movement can be controlled independently.
    var waveGroupXPosition = fillCircleMargin + fillCircleRadius * 2 - waveClipWidth;
    waveGroup.attr('transform', 'translate(' + waveGroupXPosition + ',' + waveRiseScale(fillPercent)+')');

    animateWave();

    function animateWave() {
        wave.attr('transform', 'translate(' + waveAnimateScale(wave.attr('T')) + ',0)');
        wave.transition().duration(config.waveAnimateTime * (1-wave.attr('T'))).ease('linear').attr('transform','translate('+waveAnimateScale(1)+',0)').attr('T', 1)
            .each('end', function() {
                wave.attr('T', 0);
                animateWave(config.waveAnimateTime);
            });
    }

    function GaugeUpdater(){
        this.updatePollutionGauge = function(value){
            var textRounderUpdater = function(value){return Math.round(value);};
            value = value <= 100 ? textRounderUpdater(value) : 100;

            var textTween = function(){
                var i = d3.interpolate(this.textContent, parseFloat(value).toFixed(2));
                return function(t) {this.textContent = textRounderUpdater(i(t)) + "%";}
            };

            text1.transition().duration(config.waveRiseTime).tween("text", textTween);
            text2.transition().duration(config.waveRiseTime).tween("text", textTween);

            var fillPercent = Math.max(config.minValue, Math.min(config.maxValue, value)) / config.maxValue;;
            var waveHeight = fillCircleRadius * waveHeightScale(fillPercent * 100);
            var waveRiseScale = d3.scale.linear().range([(fillCircleMargin+fillCircleRadius*2+waveHeight),(fillCircleMargin-waveHeight)]).domain([0,1]);
            var newHeight = waveRiseScale(fillPercent);
            var waveScaleX = d3.scale.linear().range([0,waveClipWidth]).domain([0,1]);
            var waveScaleY = d3.scale.linear().range([0,waveHeight]).domain([0,1]);
            var newClipArea = clipArea;

            var newWavePosition = waveAnimateScale(1);
            wave.transition().duration(0).transition().duration(config.waveAnimateTime * (1-wave.attr('T')))
                .attr('d', newClipArea).attr('transform','translate('+newWavePosition+',0)').attr('T','1')
                .each("end", function(){
                    wave.attr('transform', 'translate(' + waveAnimateScale(0) + ',0)');
                    animateWave(config.waveAnimateTime);
                    /*if (value >= 100) {
                        document.getElementById("lost-screen").style.display = "block";
                        return 100;
                    }*/
                });
            waveGroup.transition().duration(config.waveRiseTime).attr('transform', 'translate(' + waveGroupXPosition + ',' + newHeight + ')');
            return 0;
        }
    }

    return new GaugeUpdater();
}
