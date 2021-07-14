const { makeBadge } = require('badge-maker');
const path = require('path');
const fs = require('fs');
const ReportGenerator = require('lighthouse/report/report-generator');
const { promisify } = require('util');
const { exec } = require('child_process');
const R = require('ramda');
const { statusMessage } = require('./util');
const { getAverageScore, getSquashedScore } = require('./calculations');
const { urlEscaper } = require('./util');
const { percentageToColor } = require('./calculations');

// Buffer size for stdout, must be big enough to handle lighthouse CLI output
const maxBuffer = 1024 * 50000;

const metricsToSvg = async (lighthouseMetrics, badgeStyle, precedingLabel, outputPath) => {
  if ( badgeStyle == "pagespeed" ) {
    const pagespeed_svg = proceed(`${lighthouseMetrics['lighthouse performance']}`, `${lighthouseMetrics['lighthouse accessibility']}`, `${lighthouseMetrics['lighthouse best-practices']}`, `${lighthouseMetrics['lighthouse seo']}`, `${lighthouseMetrics['lighthouse pwa']}`);
    const filepath = path.join(outputPath, `pagespeed.svg`);
    fs.writeFile(filepath, pagespeed_svg, (error) => statusMessage(
      `Saved pagespeed_svg to ${filepath}\n`,
      `Failed to save pagespeed_svg to ${outputPath}`,
      error,
    ));
    return false;
  } else {
    R.keys(lighthouseMetrics).map((lighthouseMetricKey) => {
      const filepath = path.join(outputPath, `${lighthouseMetricKey.replace(/ /g, '_')}.svg`);
      const badgeColor = percentageToColor(lighthouseMetrics[lighthouseMetricKey]);
      const badgeLabel = precedingLabel + lighthouseMetricKey.charAt(11).toUpperCase() + lighthouseMetricKey.slice(12);

      const svg = makeBadge({
	label: badgeLabel,
	message: `${lighthouseMetrics[lighthouseMetricKey]}%`,
	color: badgeColor,
	style: badgeStyle,
      });

      fs.writeFile(filepath, svg, (error) => statusMessage(
	`Saved svg to ${filepath}\n`,
	`Failed to save svg to ${outputPath}`,
	error,
      ));

      return true;
    });
  }
};

const htmlReportsToFile = async (htmlReports, outputPath) => htmlReports.map((htmlReport) => {
  const url = R.head(R.keys(htmlReport));
  if (htmlReport[url]) {
    const filepath = path.join(outputPath, `${urlEscaper(url)}.html`);
    fs.writeFile(filepath, htmlReport[url], (error) => statusMessage(
      `Saved report to ${filepath}\n`,
      `Failed to save report to ${outputPath}`,
      error,
    ));
  }
  return false;
});

const generateArtifacts = async ({ reports, svg, outputPath }) => {
  await Promise.all([
    htmlReportsToFile(reports, outputPath),
    metricsToSvg(svg.results, svg.style, svg.precedingLabel, outputPath),
  ]);
};

const processRawLighthouseResult = async (data, url, shouldSaveReport) => {
  const htmlReport = shouldSaveReport ? ReportGenerator.generateReportHtml(data) : false;
  const { categories } = data;
  const scores = R.keys(categories).map((category) => (
    { [`lighthouse ${category.toLowerCase()}`]: categories[category].score * 100 }
  ));
  const lighthouseMetrics = Object.assign({}, ...scores);
  return { metrics: lighthouseMetrics, report: { [url]: htmlReport } };
};

const calculateLighthouseMetrics = async (url, shouldSaveReport, additionalParams = '') => {
  const lighthouseBinary = path.join(__dirname, '..', 'node_modules', '.bin', 'lighthouse');
  const params = `--chrome-flags='--headless --no-sandbox --disable-gpu --disable-dev-shm-usage --no-default-browser-check --no-first-run --disable-default-apps' --output=json --output-path=stdout --quiet ${additionalParams}`;
  const lighthouseCommand = `${lighthouseBinary} ${params} ${url}`;
  const execPromise = promisify(exec);
  const { stdout } = await execPromise(`${lighthouseCommand}`, { maxBuffer });
  return processRawLighthouseResult(JSON.parse(stdout), url, shouldSaveReport);
};

const processParameters = async (args, func) => {
  const outputPath = args.output_path || process.cwd();

  fs.mkdir(outputPath, { recursive: true }, (err) => {
    if (err) throw err;
  });

  const additionalParams = process.env.LIGHTHOUSE_BADGES_PARAMS || '';
  const results = await Promise.all(args.urls.map(
    (url) => func(url, args.save_report, additionalParams),
  ));

  const metrics = R.pluck('metrics', results);
  const reports = R.pluck('report', results);

  const metricsResults = ( args.single_badge && ( args.badge_style != "pagespeed" ) )
    ? await getSquashedScore(metrics)
    : await getAverageScore(metrics);

  await generateArtifacts({
    reports,
    svg: { results: metricsResults, style: args.badge_style, precedingLabel: args.preceding_label },
    outputPath,
  });
};

module.exports = {
  metricsToSvg,
  htmlReportsToFile,
  processRawLighthouseResult,
  calculateLighthouseMetrics,
  processParameters,
};

//
// PageSpeed insight functions: guageClass() and proceed()
//
// original repository: readme-pagespeed-insights 
// original author: Ankur Parihar
// original source: https://github.com/ankurparihar/readme-pagespeed-insights
// original license: Apache-2.0
// original copyright (c) 2021 Ankur Parihar

function guageClass(score) {
  if (score >= 90) {
    return 'guage-green'
  }
  else if (score >= 50) {
    return 'guage-orange'
  }
  else if (score >= 0) {
    return 'guage-red'
  }
  return 'guage-undefined'
}

// Function edited by Sitdisch
function proceed(performance, accessibility, best_practices, seo, pwa) {
	let svg = `
	<svg class="theme" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" fill="none" width="1000" height="285">
		<style>
			.gauge-base {
				opacity: 0.1
			}
			.gauge-arc {
				fill: none;
				animation-delay: 250ms;
				stroke-linecap: round;
				transform: rotate(-90deg);
				transform-origin: 100px 60px;
				animation: load-gauge 1s ease forwards
			}
			.guage-text {
				font-size: 40px;
				font-family: monospace;
				text-align: center
			}
			.guage-red {
				color: #ff4e42;
				fill: #ff4e42;
				stroke: #ff4e42
			}
			.guage-orange {
				color: #ffa400;
				fill: #ffa400;
				stroke: #ffa400
			}
			.guage-green {
				color: #0cce6b;
				fill: #0cce6b;
				stroke: #0cce6b
			}
			.theme .guage-undefined {
				color: #5c5c5c;
				fill: #5c5c5c;
				stroke: #5c5c5c
			}
			.guage-title {
				stroke: none;
				font-size: 26px;
				line-height: 26px;
				font-family: Roboto, Halvetica, Arial, sans-serif
			}
			.metric.guage-title {
				font-family: 'Courier New', Courier, monospace
			}
			.theme .guage-title {
				color: #737373;
				fill: #737373
			}
			@keyframes load-gauge {
				from {
					stroke-dasharray: 0 352.858
				}
			}
			.theme
				stroke: #616161
			}
		</style>
		<svg class="guage-div guage-perf ${guageClass(performance)}" viewBox="0 0 200 200" width="200" height="200" x="0" y="0">
			<circle class="gauge-base" r="56" cx="100" cy="60" stroke-width="8"></circle>
			<circle class="gauge-arc guage-arc-1" r="56" cx="100" cy="60" stroke-width="8" style="stroke-dasharray: ${performance >= 0 ? performance * 351.858 / 100 : 351.858}, 351.858;"></circle>
			<text class="guage-text" x="100px" y="60px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">${performance >= 0 ? performance : 'NA'}</text>
			<text class="guage-title" x="100px" y="160px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">Performance</text>
		</svg>
		<svg class="guage-div guage-acc ${guageClass(accessibility)}" viewBox="0 0 200 200" width="200" height="200" x="200" y="0">
			<circle class="gauge-base" r="56" cx="100" cy="60" stroke-width="8"></circle>
			<circle class="gauge-arc guage-arc-2" r="56" cx="100" cy="60" stroke-width="8" style="stroke-dasharray: ${accessibility >= 0 ? accessibility * 351.858 / 100 : 351.858}, 351.858;"></circle>
			<text class="guage-text" x="100px" y="60px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">${accessibility >= 0 ? accessibility : 'NA'}</text>
			<text class="guage-title" x="100px" y="160px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">Accessibility</text>
		</svg>
		<svg class="guage-div guage-best ${guageClass(best_practices)}" viewBox="0 0 200 200" width="200" height="200" x="400" y="0">
			<circle class="gauge-base" r="56" cx="100" cy="60" stroke-width="8"></circle>
			<circle class="gauge-arc guage-arc-3" r="56" cx="100" cy="60" stroke-width="8" style="stroke-dasharray: ${best_practices >= 0 ? best_practices * 351.858 / 100 : 351.858}, 351.858;"></circle>
			<text class="guage-text" x="100px" y="60px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">${best_practices >= 0 ? best_practices : 'NA'}</text>
			<text class="guage-title" x="100px" y="160px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">Best Practices</text>
		</svg>
		<svg class="guage-div guage-seo ${guageClass(seo)}" viewBox="0 0 200 200" width="200" height="200" x="600" y="0">
			<circle class="gauge-base" r="56" cx="100" cy="60" stroke-width="8"></circle>
			<circle class="gauge-arc guage-arc-4" r="56" cx="100" cy="60" stroke-width="8" style="stroke-dasharray: ${seo >= 0 ? seo * 351.858 / 100 : 351.858}, 351.858;"></circle>
			<text class="guage-text" x="100px" y="60px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">${seo >= 0 ? seo : 'NA'}</text>
			<text class="guage-title" x="100px" y="160px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">SEO</text>
		</svg>
		<svg class="guage-div guage-pwa ${guageClass(pwa)}" viewBox="0 0 200 200" width="200" height="200" x="800" y="0">
			<circle class="gauge-base" r="56" cx="100" cy="60" stroke-width="8"></circle>
			<circle class="gauge-arc guage-arc-4" r="56" cx="100" cy="60" stroke-width="8" style="stroke-dasharray: ${pwa >= 0 ? pwa * 351.858 / 100 : 351.858}, 351.858;"></circle>
			<text class="guage-text" x="100px" y="60px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">${pwa >= 0 ? pwa : 'NA'}</text>
			<text class="guage-title" x="100px" y="160px" alignment-baseline="central" dominant-baseline="central" text-anchor="middle">PWA</text>
		</svg>
		<svg width="604" height="76" x="200" y="210">
			<g>
				<rect fill="none" id="canvas_background" height="80" width="604" y="-1" x="-1"/>
				<g display="none" overflow="visible" y="0" x="0" height="100%" width="100%" id="canvasGrid">
					<rect fill="url(#gridpattern)" stroke-width="0" y="0" x="0" height="100%" width="100%"/>
				</g>
			</g>
			<g>
				<rect fill-opacity="0" stroke="#616161" stroke-width="2" rx="40" id="svg_2" height="72" width="600" y="2" x="1" fill="#000000"/>
				<rect stroke="#000" rx="8" id="svg_3" height="14" width="48" y="30" x="35" stroke-opacity="null" stroke-width="0" fill="#ff4e42"/>
				<rect stroke="#000" rx="6" id="svg_4" height="14" width="48" y="30" x="220" stroke-opacity="null" stroke-width="0" fill="#ffa400"/>
				<rect stroke="#000" rx="6" id="svg_5" height="14" width="48" y="30" x="420" stroke-opacity="null" stroke-width="0" fill="#0cce6b"/>
				<text xml:space="preserve" text-anchor="start" font-family="'Courier New', Courier, monospace" font-size="26" id="svg_6" y="45" x="100" stroke-opacity="null" stroke-width="0" stroke="#000" fill="#737373">0-49</text>
				<text xml:space="preserve" text-anchor="start" font-family="'Courier New', Courier, monospace" font-size="26" id="svg_7" y="45" x="280" stroke-opacity="null" stroke-width="0" stroke="#000" fill="#737373">50-89</text>
				<text xml:space="preserve" text-anchor="start" font-family="'Courier New', Courier, monospace" font-size="26" id="svg_8" y="45" x="480" stroke-opacity="null" stroke-width="0" stroke="#000" fill="#737373">90-100</text>
			</g>
		</svg>
	</svg>`;
	return svg;
}
