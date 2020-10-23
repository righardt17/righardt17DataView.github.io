
let fileName;

function readSingleFile(evt) {
  let f = evt.target.files[0];
  if (f) {
    let r = new FileReader();
    r.onload = function (e) {
      let contents = e.target.result;
      fileName = f.name;
      
    };

    r.readAsText(f);
    // document.write(output);
  } else {
    alert("Failed to load file");
  }
}
document.getElementById("fileinput").addEventListener("change", readSingleFile);

// Read the uploaded csv file
function uploadDealcsv() {}

/*------ Method for read uploded csv file ------*/
uploadDealcsv.prototype.getCsv = function (e) {
  let input = document.getElementById("fileinput");
  input.addEventListener("change", function () {
    if (this.files && this.files[0]) {
      var myFile = this.files[0];
      var reader = new FileReader();

      reader.addEventListener("load", function (e) {
        let csvdata = e.target.result;
        parseCsv.getParsecsvdata(csvdata); // calling function for parse csv data
      });

      reader.readAsBinaryString(myFile);
    }
  });
};

/*------- Method for parse csv data and display --------------*/
uploadDealcsv.prototype.getParsecsvdata = function (data) {
  let parsedata = [];

  let newLinebrk = data.split("\n");
  for (let i = 0; i < newLinebrk.length; i++) {
    parsedata.push(newLinebrk[i].split(","));
  }
  
  //-----------------------------------
  //-----WORK FROM HERE ON FORWARD-----
  //-----------------------------------
  d3.csv(fileName).then((data) => {
    console.log(data);
  });

  //read the parsed data
  //[][] - first bracket = rows & second bracket = columns
  console.log(parsedata[0][0].replace("ï»¿", ""));
  console.table(parsedata);
  console.log("Data points:"+ (parsedata.length - 2));

  //remove weird characters infront of first column heading
  parsedata[0][0] = parsedata[0][0].replace("ï»¿", "");
  let columnsHeadings;
  let rowValues = [];

  //populate row values into rowValues
  for (let i = 1; i < parsedata.length - 1; i++) {
    rowValues[i - 1] = parsedata[i];
  }
  //retreive column headings
  columnsHeadings = parsedata[0];

  //Inspect the Columns and rows
  console.log(columnsHeadings);
  console.log(rowValues);

  let period = [];
  let demand = [];

  // populate the period and demand of the data into seperate arrays
  for (let i = 0; i < rowValues.length; i++) {
    period[i] = rowValues[i][0]; //parseFloat ?
    demand[i] = parseFloat(rowValues[i][1]);
  }

  //--------------------------------------------------------------------
  //----------------------------SES Forecasting-------------------------
  //--------------------------------------------------------------------
  //data manipulation to determine simple exponential smoothing forecast

  //default alpha value
  let alpha = 0.1;
  //Important variables
  let SESlevel_Lt = [];
  let SESforecast_Ft = [];
  let SESerror_Et = [];
  let SESabsoluteError_At = [];
  let SESmeanSqrdError_MSEt = [];
  let SESdataMAD = [];
  let SESpercError = [];
  let SES_MAPEt = [];
  let SESdataTSt = [];

  //populating the level array:
  let averageDemand;
  let sum = 0;
  for (let i = 0; i < demand.length; i++) {
    sum = sum + demand[i];
  }
  averageDemand = sum / demand.length;
  averageDemand = averageDemand;
  SESlevel_Lt[0] = averageDemand;

  //_________________________________________________
  //Determining the optimal alpha for the dataset:
  //_________________________________________________
  let optimalAlpha = 0.5;
  let optSESlevel = [];
  optSESlevel[0] = averageDemand;
  let optSESerror = [];
  let lowestSMEavg = Math.pow(10, 99);
  let counter = 0;
  let optErrorSqSum = 0;
  for (let i = 0; i <= 1000000; i++) {
    optErrorSqSum = 0;
    for (let j = 0; j < demand.length; j++) {
      optSESlevel[j + 1] = counter * demand[j] + (1 - counter) * optSESlevel[j];
      optSESerror[j] = optSESlevel[j] - demand[j];
      optErrorSqSum = optErrorSqSum + Math.pow(optSESerror[j], 2);
      SESmeanSqrdError_MSEt[j] = optErrorSqSum / (j + 1);
    }
    if (lowestSMEavg > SESmeanSqrdError_MSEt[demand.length - 1]) {
      lowestSMEavg = SESmeanSqrdError_MSEt[demand.length - 1];
      optimalAlpha = counter;
    }
    counter = counter + 0.000001;
  }

  //_______________________________________________
  //Forecast associated calculations using opt. alpha:
  //_______________________________________________

  let errorSqSum = 0;
  let errorSum = 0;
  let sumMAPE = 0;
  let sumTS = 0;
  for (let i = 0; i < demand.length; i++) {
    //Lt
    SESlevel_Lt[i + 1] =
      optimalAlpha * demand[i] + (1 - optimalAlpha) * SESlevel_Lt[i];
    //Ft
    SESforecast_Ft = SESlevel_Lt;
    //Et
    SESerror_Et[i] = SESforecast_Ft[i] - demand[i];
    //At
    SESabsoluteError_At[i] = Math.abs(SESerror_Et[i]);
    //MSEt
    errorSqSum = errorSqSum + Math.pow(SESerror_Et[i], 2);
    SESmeanSqrdError_MSEt[i] = errorSqSum / (i + 1);
    //MADt
    errorSum = errorSum + SESabsoluteError_At[i];
    SESdataMAD[i] = errorSum / (i + 1);
    //%ERROR
    SESpercError[i] = (100 * SESabsoluteError_At[i]) / demand[i];
    //MAPEt
    sumMAPE = sumMAPE + SESpercError[i];
    SES_MAPEt[i] = sumMAPE / (i + 1);
    //TSt
    sumTS = sumTS + SESerror_Et[i];
    SESdataTSt[i] = sumTS / SESdataMAD[i];
  }

  //
  //
  //Setup arrays for chart:
  let SESchartPeriod = [];
  let SESchartForecast = [];

  for (let i = 0; i < period.length; i++) {
    SESchartPeriod[i] = period[i];
  }

  for (let i = 0; i < SESforecast_Ft.length; i++) {
    SESchartForecast[i] = Math.round(SESforecast_Ft[i]);
  }
  SESchartPeriod.push(SESforecast_Ft.length); //add the forecast of next period
  //

  //____Prediction Confidence Interval
  let ses95PCI = "";
  let ses95UCI = [];
  let ses95LCI = [];
  //95% UCI
  for (let i = 0; i < SESforecast_Ft.length; i++) {
    if (i > demand.length - 1) {
      ses95UCI[i] =
        SESforecast_Ft[i] +
        1.96 * Math.sqrt(SESmeanSqrdError_MSEt[demand.length - 1]);
    } else {
      ses95UCI[i] = Math.round(SESforecast_Ft[i]);
    }
  }
  //95% LCI
  for (let i = 0; i < SESforecast_Ft.length; i++) {
    if (i > demand.length - 1) {
      ses95LCI[i] =
        SESforecast_Ft[i] -
        1.96 * Math.sqrt(SESmeanSqrdError_MSEt[demand.length - 1]);
    } else {
      ses95LCI[i] = Math.round(SESforecast_Ft[i]);
    }
  }

  //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //SES Line Graph and Bar Graph
  //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  document.getElementById("sesGraph").style.backgroundColor = "white";
  document.getElementById("sesGraph").style.outlineStyle = "solid";
  document.getElementById("sesGraph").style.outlineColor = "black";
  document.getElementById("sesGraph").style.outlineWidth = "2px";
  document.getElementById("sesOptAlpha").innerText = optimalAlpha.toFixed(4);

  const ctx = document.getElementById("sesGraph").getContext("2d");

  //global graph configurations
  Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartSesForcast = new Chart(ctx, {
    // The type of chart we want to create
    type: "bar", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: SESchartPeriod,
      datasets: [
        {
          label: "Previous Sales Demand",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(64, 221, 213)",
          borderColor: "rgb(64, 221, 213)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(64, 221, 213)",
          pointBackgroundColor: "rgb(64, 221, 213)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(64, 221, 213)",
          pointHoverBorderColor: "rgb(0, 221, 213)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: demand,
          order: 3, //below
        },

        {
          label: "Forecast",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: SESchartForecast,
          type: "line",
          order: 1, //on top
        },
        {
          label: "95% UCI",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(144, 0, 255)",
          borderColor: "rgb(144, 0, 255)",
          borderCapStyle: "round",
          borderDash: [],
          borderWidth: 2,
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(144, 0, 255)",
          pointBackgroundColor: "rgb(144, 0, 255",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(144, 0, 255)",
          pointHoverBorderColor: "rgb(144, 0, 255)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 4,
          data: ses95UCI,
          type: "line",
          order: 2,
        },
        {
          label: "95% LCI",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(144, 0, 255)",
          borderColor: "rgb(144, 0, 255)",
          borderCapStyle: "round",
          borderDash: [],
          borderWidth: 2,
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(144, 0, 255)",
          pointBackgroundColor: "rgb(144, 0, 255",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(144, 0, 255)",
          pointHoverBorderColor: "rgb(144, 0, 255)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 4,
          data: ses95LCI,
          type: "line",
          order: 2,
        },
      ],
    },

    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        xAxes: [
          {
            ticks: {
              suggestedMax: 13,
              //beginAtZero: true,
            },
          },
        ],
      },

      title: {
        display: true,
        text: "Demand Forecast over a Period",
        fontSize: 20,
      },
    },
  });


  //--------------------------------------------------------------------
  //----------------------------SES Error Dist.-------------------------
  //--------------------------------------------------------------------

  let sesMeanError;
  let sesErrorStd;
  let s = 0;
  let difSum = 0;

  //------This was actually normalising the error distribution------
  for (let i = 0; i < SESerror_Et.length; i++) {
    s = s + SESerror_Et[i];
  }
  sesMeanError = s / SESerror_Et.length; //correct  (eq 2.3)

  for (let i = 0; i < SESerror_Et.length; i++) {
    difSum =
      difSum + Math.pow(SESerror_Et[i] - sesMeanError, 2) / SESerror_Et.length; //(eq 2.15)
  }
  sesErrorStd = Math.sqrt(difSum); //correct  (eq 2.15)
  //

  let sesErrorValSort = SESerror_Et;
  sesErrorValSort = sesErrorValSort.sort((a, b) => a - b); //sort ascending
  let sesErrorDist = [];

  for (let i = 0; i < SESerror_Et.length; i++) {
    sesErrorValSort[i] = Math.round(sesErrorValSort[i]);
  }
  //

  for (let i = 0; i < SESerror_Et.length; i++) {
    sesErrorDist[i] =
      (1 / (sesErrorStd * Math.sqrt(2 * Math.PI))) *
      Math.exp(
        -0.5 * Math.pow((sesErrorValSort[i] - sesMeanError) / sesErrorStd, 2)
      );
  }
  //console.log(sesErrorDist);
  //
  //-------------Actual Error Frequency Distribution-------------
  let sesErrorCount = 0;
  let sesErrorFreqArr = [];
  let sesErrorValArr = [];
  counter = 0;
  //populate error values array
  for (let i = 0; i < sesErrorValSort.length; i++) {
    //if error value not already in array, add it
    if (sesErrorValArr.includes(sesErrorValSort[i]) === false) {
      sesErrorValArr[counter] = sesErrorValSort[i];
      counter++;
    }
  }

  //determine the error value frequency in SES error value sort array
  for (let i = 0; i < sesErrorValArr.length; i++) {
    sesErrorCount = 0;
    for (let j = 0; j < sesErrorValSort.length; j++) {
      if (sesErrorValSort[j] === sesErrorValArr[i]) {
        sesErrorCount++;
      }
    }
    sesErrorFreqArr[i] = sesErrorCount;
  }

  ///------------------------------------------------------------
  //
  //GRAPH - SES Error Distribution

  document.getElementById("sesErrorDist").style.backgroundColor = "white";
  document.getElementById("sesErrorDist").style.outlineStyle = "solid";
  document.getElementById("sesErrorDist").style.outlineColor = "black";
  document.getElementById("sesErrorDist").style.outlineWidth = "2px";

  const ctx1 = document.getElementById("sesErrorDist").getContext("2d");

  //global graph configurations
  Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartSesError = new Chart(ctx1, {
    // The type of chart we want to create
    type: "bar", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: sesErrorValArr,
      datasets: [
        {
          label: "Error Distribution",
          fill: true,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: sesErrorFreqArr, //sesErrorDist,
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        xAxes: [
          {
            ticks: {},
          },
        ],
      },

      title: {
        display: true,
        text: "SES Forecast Error Distribution ",
        fontSize: 20,
      },
    },
  });

  //______________________________________________
  //---Creating the SES Error MEasure Table

  let sesLowTS = Infinity;
  let sesHighTS = -1000000000;
  let sesTSsum = 0;
  let sesTSavg;
  for (let i = 0; i < SESdataTSt.length; i++) {
    if (SESdataTSt[i] < sesLowTS) {
      sesLowTS = SESdataTSt[i];
    }
    if (SESdataTSt[i] > sesHighTS) {
      sesHighTS = SESdataTSt[i];
    }
    sesTSsum = sesTSsum + SESdataTSt[i];
  }
  sesTSavg = sesTSsum / SESdataTSt.length;
  let sesTSrange = sesLowTS.toFixed(2) + " to " + sesHighTS.toFixed(2);
  const tableBody = document.getElementById("sesTableData");
  let last = demand.length - 1;
  let sesDataHtml = `<tr><td class="td">${SESmeanSqrdError_MSEt[last].toFixed(
    2
  )}</td><td class="td">${SESdataMAD[last].toFixed(
    2
  )}</td><td class="td">${SES_MAPEt[last].toFixed(
    2
  )}</td><td class="td">${sesTSrange}</td><td class="td">${sesTSavg.toFixed(
    2
  )}</td>`;
  tableBody.innerHTML = sesDataHtml; //sets the table contents equal to the sesDataHtml

  document.getElementById("sesTableData").style.width = "100%";

  //---------------------------------
  //SES Error Monitoring
  //---------------------------------

  let sesErrorCCstd = Math.sqrt(
    SESmeanSqrdError_MSEt[demand.length - 1]
  ).toFixed(2);
  let ses3sigma = 3 * sesErrorCCstd;

  let zeroBaseline = [];
  let sesUCL = [];
  let sesLCL = [];
  let sesErrorCC = [];
  //populate CC arrays:
  for (let i = 0; i < demand.length; i++) {
    zeroBaseline[i] = 0;
    sesUCL[i] = ses3sigma.toFixed(2);
    sesLCL[i] = -ses3sigma.toFixed(2);
    //Et
    sesErrorCC[i] = SESforecast_Ft[i] - demand[i];
  }

  //Graph - SES Control Chart
  document.getElementById("sesControlChart").style.backgroundColor = "white";
  document.getElementById("sesControlChart").style.outlineStyle = "solid";
  document.getElementById("sesControlChart").style.outlineColor = "black";
  document.getElementById("sesControlChart").style.outlineWidth = "2px";
  document.getElementById("sesUCL").innerText = ses3sigma.toFixed(2);
  document.getElementById("sesLCL").innerText = -ses3sigma.toFixed(2);

  const ctx2 = document.getElementById("sesControlChart").getContext("2d");

  //global graph configurations
  //Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartSEScc = new Chart(ctx2, {
    // The type of chart we want to create
    type: "line", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: period,
      datasets: [
        {
          label: "Error",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 2,
          pointHitRadius: 10,
          data: sesErrorCC, //sesErrorDist,
          order: 1,
        },
        {
          label: "Baseline",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(28, 3, 252)",
          borderColor: "rgb(28, 3, 252)",
          borderCapStyle: "round",
          borderDash: [5, 5],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(28, 3, 252)",
          pointBackgroundColor: "rgb(28, 3, 252)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(28, 3, 252)",
          pointHoverBorderColor: "rgb(28, 3, 252)",
          pointHoverBorderWidth: 1,
          pointRadius: 0,
          pointHitRadius: 10,
          data: zeroBaseline,
          type: "line",
          order: 2,
        },
        {
          label: "UCL",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: sesUCL,
          type: "line",
          order: 3,
        },
        {
          label: "LCL",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: sesLCL,
          type: "line",
          order: 3,
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {},
          },
        ],
        xAxes: [
          {
            ticks: {},
          },
        ],
      },

      title: {
        display: true,
        text: "SES Control Chart (3σ) ",
        fontSize: 20,
      },
    },
  });

  //---------------------------------
  //---------------------------------

  //---------------------------------
  //SES TS section of error monitoring
  let tsUCL = [];
  let tsLCL = [];

  //populate arrays:
  for (let i = 0; i < demand.length; i++) {
    tsUCL[i] = 6;
    tsLCL[i] = -6;
  }

  //Graph - SES TS Chart

  document.getElementById("sesTSChart").style.backgroundColor = "white";
  document.getElementById("sesTSChart").style.outlineStyle = "solid";
  document.getElementById("sesTSChart").style.outlineColor = "black";
  document.getElementById("sesTSChart").style.outlineWidth = "2px";

  const ctx3 = document.getElementById("sesTSChart").getContext("2d");

  //global graph configurations
  //Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartSEStsc = new Chart(ctx3, {
    // The type of chart we want to create
    type: "line", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: period,
      datasets: [
        {
          label: "TS",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: SESdataTSt,
        },
        {
          label: "Baseline",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(28, 3, 252)",
          borderColor: "rgb(28, 3, 252)",
          borderCapStyle: "round",
          borderDash: [5, 5],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(28, 3, 252)",
          pointBackgroundColor: "rgb(28, 3, 252)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(28, 3, 252)",
          pointHoverBorderColor: "rgb(28, 3, 252)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: zeroBaseline,
          type: "line",
        },
        {
          label: "UCL",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: tsUCL,
          type: "line",
        },
        {
          label: "LCL",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: tsLCL,
          type: "line",
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        xAxes: [
          {
            ticks: {},
          },
        ],
      },

      title: {
        display: true,
        text: "SES TS Chart ",
        fontSize: 20,
      },
    },
  });

  //---------------------------------

  //--------------------------------------------------------------------
  //----------------------------HOLT's Forecasting----------------------
  //--------------------------------------------------------------------
  //data manipulation to determine Holt's Model forecast

  //default alpha value
  let holtAlpha = 0.1;
  //default beta value
  let holtBeta = 0.2;
  //Important variables
  let holtLevel_Lt = [];
  let holtTrend_Tt = [];
  let holtForecast_Ft = [];
  let holtError_Et = [];
  let holtAbsoluteError_At = [];
  let holtMeanSqrdError_MSEt = [];
  let holtDataMAD = [];
  let holtPercError = [];
  let holt_MAPEt = [];
  let holtDataTSt = [];

  //
  //_____________Linear Regression_________________
  let x = [];
  let y = [];
  let xy = [];
  let xPow2 = [];
  let yPow2 = [];
  //sum
  let xSum = 0;
  let ySum = 0;
  let xySum = 0;
  let xPow2Sum = 0;
  let yPow2Sum = 0;
  //important averages
  let xAvg = 0;
  let yAvg = 0;
  //formula answers (constants)
  let levelZero = 0;
  let trendZero = 0;

  //populate values and sum arrays
  for (let i = 0; i < demand.length; i++) {
    x[i] = i + 1; //parseFloat(period[i])
    y[i] = demand[i];
    xy[i] = x[i] * y[i];
    xPow2[i] = Math.pow(x[i], 2);
    yPow2[i] = Math.pow(y[i], 2);
    //sum
    xSum = xSum + x[i];
    ySum = ySum + y[i];
    xySum = xySum + xy[i];
    xPow2Sum = xPow2Sum + xPow2[i];
    yPow2Sum = yPow2Sum + yPow2[i];
  }

  //averages
  xAvg = xSum / demand.length;
  yAvg = ySum / demand.length;

  //trend_0
  trendZero =
    (xySum - demand.length * xAvg * yAvg) /
    (xPow2Sum - demand.length * Math.pow(xAvg, 2));
  //level_0
  levelZero = yAvg - trendZero * xAvg;
  //inidividual values

  //add level and trend t = 0 values to arrays
  holtLevel_Lt[0] = levelZero;
  holtTrend_Tt[0] = trendZero;
  ////
  ////
  //_________________________________________________
  //Determining the optimal alpha and beta for the dataset:
  //_________________________________________________
  let optHoltAlpha = 0.1;
  let optHoltBeta = 0.2;
  let optHoltLevel = [];
  let optHoltTrend = [];
  optHoltLevel[0] = levelZero;
  optHoltTrend[0] = trendZero;
  let optHoltForecast = [];
  let optHoltError = [];
  lowestSMEavg = Math.pow(10, 99);
  let counterA = 0;
  let counterB = 0;
  //optErrorSqSum = 0;
  for (let i = 0; i <= 1000; i++) {
    counterB = 0;
    for (let j = 0; j < 1000; j++) {
      optErrorSqSum = 0;
      for (let k = 0; k < demand.length; k++) {
        //Level
        optHoltLevel[k + 1] =
          counterA * demand[k] +
          (1 - counterA) * (optHoltLevel[k] + optHoltTrend[k]);
        //Trend
        optHoltTrend[k + 1] =
          counterB * (optHoltLevel[k + 1] - optHoltLevel[k]) +
          (1 - counterB) * optHoltTrend[k];
        //Forecast
        optHoltForecast[k] = optHoltLevel[k] + optHoltTrend[k];
        //Error
        optHoltError[k] = optHoltForecast[k] - demand[k];
        optErrorSqSum = optErrorSqSum + Math.pow(optHoltError[k], 2);
        //MSE
        holtMeanSqrdError_MSEt[k] = optErrorSqSum / (k + 1);
      }
      if (lowestSMEavg > holtMeanSqrdError_MSEt[demand.length - 1]) {
        lowestSMEavg = holtMeanSqrdError_MSEt[demand.length - 1];
        optHoltAlpha = counterA;
        optHoltBeta = counterB;
      }
      counterB = counterB + 0.001;
    }

    counterA = counterA + 0.001;
  }

  ////
  //_______________________________________________
  //Forecast associated calculations using opt. alpha:
  //_______________________________________________

  errorSqSum = 0;
  errorSum = 0;
  sumMAPE = 0;
  sumTS = 0;
  for (let i = 0; i < demand.length; i++) {
    //Lt
    holtLevel_Lt[i + 1] =
      optHoltAlpha * demand[i] +
      (1 - optHoltAlpha) * (holtLevel_Lt[i] + holtTrend_Tt[i]);
    //Tt
    holtTrend_Tt[i + 1] =
      optHoltBeta * (holtLevel_Lt[i + 1] - holtLevel_Lt[i]) +
      (1 - optHoltBeta) * holtTrend_Tt[i];
    //Ft
    holtForecast_Ft[i] = holtLevel_Lt[i] + holtTrend_Tt[i];
    //Et
    holtError_Et[i] = holtForecast_Ft[i] - demand[i];
    //At
    holtAbsoluteError_At[i] = Math.abs(holtError_Et[i]);
    //MSEt
    errorSqSum = errorSqSum + Math.pow(holtError_Et[i], 2);
    holtMeanSqrdError_MSEt[i] = errorSqSum / (i + 1);
    //MADt
    errorSum = errorSum + holtAbsoluteError_At[i];
    holtDataMAD[i] = errorSum / (i + 1);
    //%ERROR
    holtPercError[i] = (100 * holtAbsoluteError_At[i]) / demand[i];
    //MAPEt
    sumMAPE = sumMAPE + holtPercError[i];
    holt_MAPEt[i] = sumMAPE / (i + 1);
    //TSt
    sumTS = sumTS + holtError_Et[i];
    holtDataTSt[i] = sumTS / holtDataMAD[i];
  }

  //
  //add future forecast values
  for (let i = 0; i < holtLevel_Lt.length; i++) {
    holtForecast_Ft[i] = holtLevel_Lt[i] + holtTrend_Tt[i];
  }
  for (let i = 1; i < 4; i++) {
    holtForecast_Ft[holtLevel_Lt.length - 1 + i] =
      holtLevel_Lt[holtLevel_Lt.length - 1] +
      (i + 1) * holtTrend_Tt[holtTrend_Tt.length - 1];
  }
  //
  //Setup arrays for chart:
  let holtChartPeriod = [];
  let holtChartForecast = [];

  for (let i = 0; i < period.length; i++) {
    holtChartPeriod[i] = period[i];
  }

  for (let i = 0; i < holtForecast_Ft.length; i++) {
    holtChartForecast[i] = Math.round(holtForecast_Ft[i]);
  }
  holtChartPeriod.push(holtForecast_Ft.length - 3);
  holtChartPeriod.push(holtForecast_Ft.length - 2);
  holtChartPeriod.push(holtForecast_Ft.length - 1);
  holtChartPeriod.push(holtForecast_Ft.length);
  //

  //____Prediction Confidence Interval
  let holt95PCI = "";
  let holt95UCI = [];
  let holt95LCI = [];
  //95% UCI
  for (let i = 0; i < holtForecast_Ft.length; i++) {
    if (i > demand.length - 1) {
      holt95UCI[i] =
        holtForecast_Ft[i] +
        1.96 * Math.sqrt(holtMeanSqrdError_MSEt[demand.length - 1]);
    } else {
      holt95UCI[i] = Math.round(holtForecast_Ft[i]);
    }
  }
  //95% LCI
  for (let i = 0; i < holtForecast_Ft.length; i++) {
    if (i > demand.length - 1) {
      holt95LCI[i] =
        holtForecast_Ft[i] -
        1.96 * Math.sqrt(holtMeanSqrdError_MSEt[demand.length - 1]);
    } else {
      holt95LCI[i] = Math.round(holtForecast_Ft[i]);
    }
  }

  //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //Holt's Line Graph and Bar Graph
  //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  document.getElementById("holtGraph").style.backgroundColor = "white";
  document.getElementById("holtGraph").style.outlineStyle = "solid";
  document.getElementById("holtGraph").style.outlineColor = "black";
  document.getElementById("holtGraph").style.outlineWidth = "2px";
  document.getElementById("holtOptAlpha").innerText = optHoltAlpha.toFixed(4);
  document.getElementById("holtOptBeta").innerText = optHoltBeta.toFixed(4);

  const ctx4 = document.getElementById("holtGraph").getContext("2d");

  //global graph configurations
  Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartHoltForcast = new Chart(ctx4, {
    // The type of chart we want to create
    type: "bar", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: holtChartPeriod,
      datasets: [
        {
          label: "Previous Sales Demand",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(64, 221, 213)",
          borderColor: "rgb(64, 221, 213)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(64, 221, 213)",
          pointBackgroundColor: "rgb(64, 221, 213)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(64, 221, 213)",
          pointHoverBorderColor: "rgb(0, 221, 213)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: demand,
          order: 3, //below
        },

        {
          label: "Forecast",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: holtChartForecast,
          type: "line",
          order: 1, //on top
        },
        {
          label: "95% UCI",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(144, 0, 255)",
          borderColor: "rgb(144, 0, 255)",
          borderCapStyle: "round",
          borderDash: [],
          borderWidth: 2,
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(144, 0, 255)",
          pointBackgroundColor: "rgb(144, 0, 255",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(144, 0, 255)",
          pointHoverBorderColor: "rgb(144, 0, 255)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 4,
          data: holt95UCI,
          type: "line",
          order: 2,
        },
        {
          label: "95% LCI",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(144, 0, 255)",
          borderColor: "rgb(144, 0, 255)",
          borderCapStyle: "round",
          borderDash: [],
          borderWidth: 2,
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(144, 0, 255)",
          pointBackgroundColor: "rgb(144, 0, 255",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(144, 0, 255)",
          pointHoverBorderColor: "rgb(144, 0, 255)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 4,
          data: holt95LCI,
          type: "line",
          order: 2,
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        xAxes: [
          {
            ticks: {
              suggestedMax: 13,
              //beginAtZero: true,
            },
          },
        ],
      },

      title: {
        display: true,
        text: "Demand Forecast over a Period",
        fontSize: 20,
      },
    },
  });

  //-------------Holt's Error Frequency Distribution-------------
  let holtErrorValSort = holtError_Et;
  holtErrorValSort = holtErrorValSort.sort((a, b) => a - b); //sort ascending

  for (let i = 0; i < holtError_Et.length; i++) {
    holtErrorValSort[i] = Math.round(holtErrorValSort[i]);
  }

  let holtErrorCount = 0;
  let holtErrorFreqArr = [];
  let holtErrorValArr = [];
  counter = 0;
  //populate error values array
  for (let i = 0; i < holtErrorValSort.length; i++) {
    //if error value not already in array, add it
    if (holtErrorValArr.includes(holtErrorValSort[i]) === false) {
      holtErrorValArr[counter] = holtErrorValSort[i];
      counter++;
    }
  }

  //determine the error value frequency in SES error value sort array
  for (let i = 0; i < holtErrorValArr.length; i++) {
    holtErrorCount = 0;
    for (let j = 0; j < holtErrorValSort.length; j++) {
      if (holtErrorValSort[j] === holtErrorValArr[i]) {
        holtErrorCount++;
      }
    }
    holtErrorFreqArr[i] = holtErrorCount;
  }

  ///------------------------------------------------------------

  //GRAPH - Holt Error Distribution

  document.getElementById("holtErrorDist").style.backgroundColor = "white";
  document.getElementById("holtErrorDist").style.outlineStyle = "solid";
  document.getElementById("holtErrorDist").style.outlineColor = "black";
  document.getElementById("holtErrorDist").style.outlineWidth = "2px";

  const ctx5 = document.getElementById("holtErrorDist").getContext("2d");

  //global graph configurations
  Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartHoltError = new Chart(ctx5, {
    // The type of chart we want to create
    type: "bar", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: holtErrorValArr,
      datasets: [
        {
          label: "Error Distribution",
          fill: true,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: holtErrorFreqArr, //sesErrorDist,
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        xAxes: [
          {
            ticks: {},
          },
        ],
      },

      title: {
        display: true,
        text: "Holt's Forecast Error Distribution ",
        fontSize: 20,
      },
    },
  });

  //______________________________________________
  //---Creating the Holt's Error Measure Table

  let holtLowTS = Infinity;
  let holtHighTS = -1000000000;
  let holtTSsum = 0;
  let holtTSavg;
  for (let i = 0; i < holtDataTSt.length; i++) {
    if (holtDataTSt[i] < holtLowTS) {
      holtLowTS = holtDataTSt[i];
    }
    if (holtDataTSt[i] > holtHighTS) {
      holtHighTS = holtDataTSt[i];
    }
    holtTSsum = holtTSsum + holtDataTSt[i];
  }
  holtTSavg = holtTSsum / holtDataTSt.length;
  let holtTSrange = holtLowTS.toFixed(2) + " to " + holtHighTS.toFixed(2);
  const holtTableBody = document.getElementById("holtTableData");
  last = demand.length - 1;
  let holtDataHtml = `<tr><td class="td">${holtMeanSqrdError_MSEt[last].toFixed(
    2
  )}</td><td class="td">${holtDataMAD[last].toFixed(
    2
  )}</td><td class="td">${holt_MAPEt[last].toFixed(
    2
  )}</td><td class="td">${holtTSrange}</td><td class="td">${holtTSavg.toFixed(
    2
  )}</td>`;
  holtTableBody.innerHTML = holtDataHtml; //sets the table contents equal to the sesDataHtml

  document.getElementById("holtTableData").style.width = "100%";

  //---------------------------------
  //Holt's Error Monitoring
  //---------------------------------

  let holtErrorCCstd = Math.sqrt(
    holtMeanSqrdError_MSEt[demand.length - 1]
  ).toFixed(2);
  let holt3sigma = 3 * holtErrorCCstd;

  let holtZeroBaseline = [];
  let holtUCL = [];
  let holtLCL = [];
  let holtErrorCC = [];

  //populate CC arrays:
  for (let i = 0; i < demand.length; i++) {
    holtZeroBaseline[i] = 0;
    holtUCL[i] = holt3sigma.toFixed(2);
    holtLCL[i] = -holt3sigma.toFixed(2);
    //Et
    holtErrorCC[i] = holtForecast_Ft[i] - demand[i];
  }

  //Graph - SES Control Chart
  document.getElementById("holtControlChart").style.backgroundColor = "white";
  document.getElementById("holtControlChart").style.outlineStyle = "solid";
  document.getElementById("holtControlChart").style.outlineColor = "black";
  document.getElementById("holtControlChart").style.outlineWidth = "2px";
  document.getElementById("holtUCL").innerText = holt3sigma.toFixed(2);
  document.getElementById("holtLCL").innerText = -holt3sigma.toFixed(2);

  const ctx6 = document.getElementById("holtControlChart").getContext("2d");

  //global graph configurations
  //Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartHoltCC = new Chart(ctx6, {
    // The type of chart we want to create
    type: "line", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: period,
      datasets: [
        {
          label: "Error",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 2,
          pointHitRadius: 10,
          data: holtErrorCC, //sesErrorDist,
        },
        {
          label: "Baseline",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(28, 3, 252)",
          borderColor: "rgb(28, 3, 252)",
          borderCapStyle: "round",
          borderDash: [5, 5],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(28, 3, 252)",
          pointBackgroundColor: "rgb(28, 3, 252)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(28, 3, 252)",
          pointHoverBorderColor: "rgb(28, 3, 252)",
          pointHoverBorderWidth: 1,
          pointRadius: 0,
          pointHitRadius: 10,
          data: holtZeroBaseline,
          type: "line",
          //order: 1, //on top
        },
        {
          label: "UCL",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: holtUCL,
          type: "line",
          //order: 1, //on top
        },
        {
          label: "LCL",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: holtLCL,
          type: "line",
          //order: 1, //on top
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {},
          },
        ],
        xAxes: [
          {
            ticks: {},
          },
        ],
      },

      title: {
        display: true,
        text: "Holt's Control Chart (3σ) ",
        fontSize: 20,
      },
    },
  });

  //---------------------------------
  //---------------------------------
  //Holt's TS section of error monitoring

  //Graph - Holt's TS Chart

  document.getElementById("holtTSChart").style.backgroundColor = "white";
  document.getElementById("holtTSChart").style.outlineStyle = "solid";
  document.getElementById("holtTSChart").style.outlineColor = "black";
  document.getElementById("holtTSChart").style.outlineWidth = "2px";

  const ctx7 = document.getElementById("holtTSChart").getContext("2d");

  //global graph configurations
  //Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartHoltTSC = new Chart(ctx7, {
    // The type of chart we want to create
    type: "line", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: period,
      datasets: [
        {
          label: "TS",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: holtDataTSt,
        },
        {
          label: "Baseline",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(28, 3, 252)",
          borderColor: "rgb(28, 3, 252)",
          borderCapStyle: "round",
          borderDash: [5, 5],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(28, 3, 252)",
          pointBackgroundColor: "rgb(28, 3, 252)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(28, 3, 252)",
          pointHoverBorderColor: "rgb(28, 3, 252)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: holtZeroBaseline,
          type: "line",
        },
        {
          label: "UCL",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: tsUCL,
          type: "line",
        },
        {
          label: "LCL",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: tsLCL,
          type: "line",
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        xAxes: [
          {
            ticks: {},
          },
        ],
      },

      title: {
        display: true,
        text: "Holt's TS Chart ",
        fontSize: 20,
      },
    },
  });

  //
  //--------------------------------------------------------------------
  //----------------------Winter's Forecasting---------------------
  //--------------------------------------------------------------------
  //data manipulation

  //default alpha value
  let whAlpha = 0.05;
  //default beta value
  let whBeta = 0.1;
  //default gamma value
  let whGamma = 0.1;
  //Important variables
  let whSeasFact = [];
  let whLevel_Lt = [];
  let whTrend_Tt = [];
  let whForecast_Ft = [];
  let whError_Et = [];
  let whAbsoluteError_At = [];
  let whMeanSqrdError_MSEt = [];
  let whDataMAD = [];
  let whPercError = [];
  let wh_MAPEt = [];
  let whDataTSt = [];

  //__________Optimisation___________

  let p = 4; //periodicity
  let cP = 1; //periodicty counter
  let cA = 0; //alpha counter
  let cB = 0; //beta counter
  let cG = 0; //gamma counter
  let test = 0;
  let optwhAlpha = 0;
  let optwhBeta = 0;
  let optwhGamma = 0;
  let optwhPeriod = 1;
  lowestSMEavg = Math.pow(10, 99);
  // let i = 2; i < 14; i++
  for (let i = 1; i < 13; i++) {
    cA = 0;
    if (i <= demand.length) {
      for (let j = 0; j < 20; j++) {
        cB = 0;
        for (let k = 0; k < 20; k++) {
          cG = 0;
          for (let l = 0; l < 20; l++) {
            //_______Deseasonalized demand (eq7.2)________
            let deSeasDemand72 = [];
            let deSeasDemand73 = [];

            //starting index for even and odd cycles
            let evenStartIndex = 0;
            let oddStartIndex = 0;
            let whDeseasSum = 0;

            //pattern for even periodicity is p/2 + 1
            //Check if p is even or odd
            if (cP % 2 == 0) {
              //Even formula
              for (let i = 0; i < demand.length - cP; i++) {
                whDeseasSum = 0;
                //sum from starting index
                if (cP > 2) {
                  //p > 2
                  for (let j = 1; j <= cP / 2 + 1; j++) {
                    whDeseasSum += demand[i + j];
                  }
                } else {
                  //p <= 2
                  whDeseasSum = demand[i + 1];
                }
                //populate the array for eq 7.2
                deSeasDemand72[i] =
                  (demand[i] + demand[i + cP] + 2 * whDeseasSum) / (2 * cP);
              }
            } else {
              //Odd formula (+1 by cP)*NB***********************
              for (let i = 0; i < demand.length - cP + 1; i++) {
                whDeseasSum = 0;
                for (let j = 0; j < cP; j++) {
                  whDeseasSum += demand[i + j];
                }
                //populate the array for eq 7.2
                deSeasDemand72[i] = whDeseasSum / cP;
              }
            }
            //
            //_____________Linear Regression_________________
            x = [];
            y = [];
            xy = [];
            xPow2 = [];
            yPow2 = [];
            //sum
            xSum = 0;
            ySum = 0;
            xySum = 0;
            xPow2Sum = 0;
            yPow2Sum = 0;
            //important averages
            xAvg = 0;
            yAvg = 0;
            //formula answers (constants)
            levelZero = 0;
            trendZero = 0;

            //Run linear regression on even or odd periodicity
            if (cP % 2 == 0) {
              //for Even
              //populate values and sum arrays
              for (let i = 0; i < demand.length - cP; i++) {
                x[i] = i + 1 + (cP / 2 + 1) - 1; //parseFloat(period[i + (cP / 2 + 1) - 1])
                y[i] = deSeasDemand72[i];
                xy[i] = x[i] * y[i];
                xPow2[i] = Math.pow(x[i], 2);
                yPow2[i] = Math.pow(y[i], 2);
                //sum
                xSum = xSum + x[i];
                ySum = ySum + y[i];
                xySum = xySum + xy[i];
                xPow2Sum = xPow2Sum + xPow2[i];
                yPow2Sum = yPow2Sum + yPow2[i];
              }
            } else {
              //for Odd (+1 by cP)*NB***********************
              //populate values and sum arrays
              for (let i = 0; i < demand.length - cP + 1; i++) {
                x[i] = i + 1 + (1 + (cP - 1) / 2) - 1; //parseFloat(period[i + (1 + (cP - 1) / 2) - 1])
                y[i] = deSeasDemand72[i];
                xy[i] = x[i] * y[i];
                xPow2[i] = Math.pow(x[i], 2);
                yPow2[i] = Math.pow(y[i], 2);
                //sum
                xSum = xSum + x[i];
                ySum = ySum + y[i];
                xySum = xySum + xy[i];
                xPow2Sum = xPow2Sum + xPow2[i];
                yPow2Sum = yPow2Sum + yPow2[i];
              }
            }

            //averages
            xAvg = xSum / deSeasDemand72.length;
            yAvg = ySum / deSeasDemand72.length;

            //trend_0
            trendZero =
              (xySum - deSeasDemand72.length * xAvg * yAvg) /
              (xPow2Sum - deSeasDemand72.length * Math.pow(xAvg, 2));
            //level_0
            levelZero = yAvg - trendZero * xAvg;

            //add level and trend t = 0 values to arrays
            whLevel_Lt[0] = levelZero;
            whTrend_Tt[0] = trendZero;

            //_______Deseasonalized demand (eq7.3) & Seasonal Factor (eq 7.5)________
            let seasFact = [];
            //populate deseasonalized array with eq 7.3 & seasonal factor with eq 7.5
            for (let i = 0; i < demand.length; i++) {
              deSeasDemand73[i] = whLevel_Lt[0] + whTrend_Tt[0] * (i + 1); // deSeasDemand73[i] = whLevel_Lt[0] + whTrend_Tt[0] * period[i]
              seasFact[i] = demand[i] / deSeasDemand73[i];
            }

            //___________Estimate Seasonal Factor for forecast use_________
            let estSeasFact = [];
            let rSeasFactSum = 0;
            let r = 0;
            r = Math.floor(demand.length / cP);
            //console.log(r);
            //populate estimate seasonal factor array
            for (let i = 0; i < cP; i++) {
              rSeasFactSum = 0;
              for (let j = i; j < demand.length; j = j + cP) {
                rSeasFactSum += seasFact[j];
              }
              estSeasFact[i] = rSeasFactSum / r;
            }

            //___________Forecast associated calculations_____________

            //Populate Seasonal Factor array
            for (let i = 0; i < cP; i++) {
              whSeasFact[i] = estSeasFact[i];
            }
            errorSqSum = 0;
            errorSum = 0;
            sumMAPE = 0;
            sumTS = 0;

            for (let i = 0; i < demand.length; i++) {
              //Level
              whLevel_Lt[i + 1] =
                cA * (demand[i] / whSeasFact[i]) +
                (1 - cA) * (whLevel_Lt[i] + whTrend_Tt[i]);
              //Trend
              whTrend_Tt[i + 1] =
                cB * (whLevel_Lt[i + 1] - whLevel_Lt[i]) +
                (1 - cB) * whTrend_Tt[i];
              //Seasonality
              whSeasFact[i + cP] =
                cG * (demand[i] / whLevel_Lt[i + 1]) + (1 - cG) * whSeasFact[i];
              //Forecast
              whForecast_Ft[i] =
                (whLevel_Lt[i] + whTrend_Tt[i]) * whSeasFact[i];
              //Error
              whError_Et[i] = whForecast_Ft[i] - demand[i];
              //Absolute Error
              whAbsoluteError_At[i] = Math.abs(whError_Et[i]);
              //MSE
              errorSqSum = errorSqSum + Math.pow(whError_Et[i], 2);
              whMeanSqrdError_MSEt[i] = errorSqSum / (i + 1);
              //MAD
              errorSum = errorSum + whAbsoluteError_At[i];
              whDataMAD[i] = errorSum / (i + 1);
              //%ERROR
              whPercError[i] = (100 * whAbsoluteError_At[i]) / demand[i];
              //MAPE
              sumMAPE = sumMAPE + whPercError[i];
              wh_MAPEt[i] = sumMAPE / (i + 1);
              //TS
              sumTS = sumTS + whError_Et[i];
              whDataTSt[i] = sumTS / whDataMAD[i];
            }
            if (lowestSMEavg > whMeanSqrdError_MSEt[demand.length - 1]) {
              lowestSMEavg = whMeanSqrdError_MSEt[demand.length - 1];
              optwhAlpha = cA;
              optwhBeta = cB;
              optwhGamma = cG;
              optwhPeriod = cP;
            }
            test++;
            cG = cG + 1 / 20;
          }

          cB = cB + 1 / 20;
        }
        cA = cA + 1 / 20;
      }
    }
    cP++;
  }

  ////
  ////

  //_______Deseasonalized demand (eq7.2)________
  let deSeasDemand72 = [];
  let deSeasDemand73 = [];

  //starting index for even and odd cycles
  let evenStartIndex = 0;
  let oddStartIndex = 0;
  let whDeseasSum = 0;

  //pattern for even periodicity is p/2 + 1
  //Check if p is even or odd
  if (optwhPeriod % 2 == 0) {
    //Even formula
    for (let i = 0; i < demand.length - optwhPeriod; i++) {
      whDeseasSum = 0;
      //sum from starting index
      if (optwhPeriod > 2) {
        //p > 2
        for (let j = 1; j <= optwhPeriod / 2 + 1; j++) {
          whDeseasSum += demand[i + j];
        }
      } else {
        //p =2
        whDeseasSum = demand[i + 1];
      }
      deSeasDemand72[i] =
        (demand[i] + demand[i + optwhPeriod] + 2 * whDeseasSum) /
        (2 * optwhPeriod);
    }
  } else {
    //Odd formula (+1 by optwhPeriod)*NB***********************
    for (let i = 0; i < demand.length - optwhPeriod + 1; i++) {
      whDeseasSum = 0;
      for (let j = 0; j < optwhPeriod; j++) {
        whDeseasSum += demand[i + j];
      }
      deSeasDemand72[i] = whDeseasSum / optwhPeriod;
    }
  }

  //
  //_____________Linear Regression_________________
  x = [];
  y = [];
  xy = [];
  xPow2 = [];
  yPow2 = [];
  //sum
  xSum = 0;
  ySum = 0;
  xySum = 0;
  xPow2Sum = 0;
  yPow2Sum = 0;
  //important averages
  xAvg = 0;
  yAvg = 0;
  //formula answers (constants)
  levelZero = 0;
  trendZero = 0;

  //Run linear regression on even or odd periodicity
  if (optwhPeriod % 2 == 0) {
    //for Even
    //populate values and sum arrays
    for (let i = 0; i < demand.length - optwhPeriod; i++) {
      x[i] = i + 1 + (optwhPeriod / 2 + 1) - 1; //parseFloat(period[i + (optwhPeriod / 2 + 1) - 1])
      y[i] = deSeasDemand72[i];
      xy[i] = x[i] * y[i];
      xPow2[i] = Math.pow(x[i], 2);
      yPow2[i] = Math.pow(y[i], 2);
      //sum
      xSum = xSum + x[i];
      ySum = ySum + y[i];
      xySum = xySum + xy[i];
      xPow2Sum = xPow2Sum + xPow2[i];
      yPow2Sum = yPow2Sum + yPow2[i];
    }
  } else {
    //for Odd (+1 by cP)*NB***********************
    //populate values and sum arrays
    for (let i = 0; i < demand.length - optwhPeriod + 1; i++) {
      x[i] = i + 1 + (1 + (optwhPeriod - 1) / 2) - 1; //parseFloat(period[i + (1 + (optwhPeriod - 1) / 2) - 1])
      y[i] = deSeasDemand72[i];
      xy[i] = x[i] * y[i];
      xPow2[i] = Math.pow(x[i], 2);
      yPow2[i] = Math.pow(y[i], 2);
      //sum
      xSum = xSum + x[i];
      ySum = ySum + y[i];
      xySum = xySum + xy[i];
      xPow2Sum = xPow2Sum + xPow2[i];
      yPow2Sum = yPow2Sum + yPow2[i];
    }
  }

  //averages
  xAvg = xSum / deSeasDemand72.length;
  yAvg = ySum / deSeasDemand72.length;

  //trend_0
  trendZero =
    (xySum - deSeasDemand72.length * xAvg * yAvg) /
    (xPow2Sum - deSeasDemand72.length * Math.pow(xAvg, 2));
  //level_0
  levelZero = yAvg - trendZero * xAvg;

  //add level and trend t = 0 values to arrays
  whLevel_Lt[0] = levelZero;
  whTrend_Tt[0] = trendZero;
  ////

  //_______Deseasonalized demand (eq7.3) & Seasonal Factor (eq 7.5)________
  let seasFact = [];
  //populate deseasonalized array with eq 7.3 & seasona factor with eq 7.5
  for (let i = 0; i < demand.length; i++) {
    deSeasDemand73[i] = whLevel_Lt[0] + whTrend_Tt[0] * (i + 1); //deSeasDemand73[i] = whLevel_Lt[0] + whTrend_Tt[0] * period[i]
    seasFact[i] = demand[i] / deSeasDemand73[i];
  }

  //___________Estimate Seasonal Factor for forecast use_________
  let estSeasFact = [];
  let rSeasFactSum = 0;
  let r = 0;
  r = Math.floor(demand.length / optwhPeriod);
  //populate estimate seasonal factor array
  for (let i = 0; i < optwhPeriod; i++) {
    rSeasFactSum = 0;
    for (let j = i; j < demand.length; j = j + optwhPeriod) {
      rSeasFactSum += seasFact[j];
    }
    estSeasFact[i] = rSeasFactSum / r;
  }

  //
  //___________Forecast associated calculations_____________

  //Populate Seasonal Factor array
  for (let i = 0; i < optwhPeriod; i++) {
    whSeasFact[i] = estSeasFact[i];
  }

  errorSqSum = 0;
  errorSum = 0;
  sumMAPE = 0;
  sumTS = 0;

  for (let i = 0; i < demand.length; i++) {
    //Level
    whLevel_Lt[i + 1] =
      optwhAlpha * (demand[i] / whSeasFact[i]) +
      (1 - optwhAlpha) * (whLevel_Lt[i] + whTrend_Tt[i]);
    //Trend
    whTrend_Tt[i + 1] =
      optwhBeta * (whLevel_Lt[i + 1] - whLevel_Lt[i]) +
      (1 - optwhBeta) * whTrend_Tt[i];
    //Seasonality
    whSeasFact[i + optwhPeriod] =
      optwhGamma * (demand[i] / whLevel_Lt[i + 1]) +
      (1 - optwhGamma) * whSeasFact[i];
    //Forecast
    whForecast_Ft[i] = (whLevel_Lt[i] + whTrend_Tt[i]) * whSeasFact[i];
    //Error
    whError_Et[i] = whForecast_Ft[i] - demand[i];
    //Absolute Error
    whAbsoluteError_At[i] = Math.abs(whError_Et[i]);
    //MSE
    errorSqSum = errorSqSum + Math.pow(whError_Et[i], 2);
    whMeanSqrdError_MSEt[i] = errorSqSum / (i + 1);
    //MAD
    errorSum = errorSum + whAbsoluteError_At[i];
    whDataMAD[i] = errorSum / (i + 1);
    //%ERROR
    whPercError[i] = (100 * whAbsoluteError_At[i]) / demand[i];
    //MAPE
    sumMAPE = sumMAPE + whPercError[i];
    wh_MAPEt[i] = sumMAPE / (i + 1);
    //TS
    sumTS = sumTS + whError_Et[i];
    whDataTSt[i] = sumTS / whDataMAD[i];
  }

  for (let j = demand.length; j < demand.length + optwhPeriod; j++) {
    whForecast_Ft[j] =
      (whLevel_Lt[demand.length] + whTrend_Tt[demand.length]) * whSeasFact[j];
  }

  //
  //
  //Setup arrays for chart:
  let whChartPeriod = [];
  let whChartForecast = [];

  for (let i = 0; i < period.length; i++) {
    whChartPeriod[i] = period[i];
  }

  for (let i = 0; i < whForecast_Ft.length; i++) {
    whChartForecast[i] = Math.round(whForecast_Ft[i]);
  }

  for (let i = 1; i <= optwhPeriod; i++) {
    whChartPeriod.push(period.length + i);
  }

  //
  //____Prediction Confidence Interval
  let wh95PCI = "";
  let wh95UCI = [];
  let wh95LCI = [];
  //95% UCI
  for (let i = 0; i < whForecast_Ft.length; i++) {
    if (i > demand.length - 1) {
      wh95UCI[i] =
        whForecast_Ft[i] +
        1.96 * Math.sqrt(whMeanSqrdError_MSEt[demand.length - 1]);
    } else {
      wh95UCI[i] = Math.round(whForecast_Ft[i]);
    }
  }
  //95% LCI
  for (let i = 0; i < whForecast_Ft.length; i++) {
    if (i > demand.length - 1) {
      wh95LCI[i] =
        whForecast_Ft[i] -
        1.96 * Math.sqrt(whMeanSqrdError_MSEt[demand.length - 1]);
    } else {
      wh95LCI[i] = Math.round(whForecast_Ft[i]);
    }
  }
  //
  //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
  //Winter Holt's Line Graph and Bar Graph
  //!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!

  document.getElementById("whGraph").style.backgroundColor = "white";
  document.getElementById("whGraph").style.outlineStyle = "solid";
  document.getElementById("whGraph").style.outlineColor = "black";
  document.getElementById("whGraph").style.outlineWidth = "2px";

  document.getElementById("whOptAlpha").innerText = optwhAlpha.toFixed(4);
  document.getElementById("whOptBeta").innerText = optwhBeta.toFixed(4);
  document.getElementById("whOptGamma").innerText = optwhGamma.toFixed(4);
  document.getElementById("periodicity").innerText = optwhPeriod;
  document.getElementById("seasCycles").innerText = r;

  const ctx8 = document.getElementById("whGraph").getContext("2d");

  //global graph configurations
  Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartwhForcast = new Chart(ctx8, {
    // The type of chart we want to create
    type: "bar", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: whChartPeriod,
      datasets: [
        {
          label: "Previous Sales Demand",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(64, 221, 213)",
          borderColor: "rgb(64, 221, 213)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(64, 221, 213)",
          pointBackgroundColor: "rgb(64, 221, 213)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(64, 221, 213)",
          pointHoverBorderColor: "rgb(0, 221, 213)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: demand,
          order: 3, //below
        },

        {
          label: "Forecast",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: whChartForecast,
          type: "line",
          order: 1, //on top
        },
        {
          label: "95% UCI",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(144, 0, 255)",
          borderColor: "rgb(144, 0, 255)",
          borderCapStyle: "round",
          borderDash: [],
          borderWidth: 2,
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(144, 0, 255)",
          pointBackgroundColor: "rgb(144, 0, 255",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(144, 0, 255)",
          pointHoverBorderColor: "rgb(144, 0, 255)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 4,
          data: wh95UCI,
          type: "line",
          order: 2,
        },
        {
          label: "95% LCI",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(144, 0, 255)",
          borderColor: "rgb(144, 0, 255)",
          borderCapStyle: "round",
          borderDash: [],
          borderWidth: 2,
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(144, 0, 255)",
          pointBackgroundColor: "rgb(144, 0, 255",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(144, 0, 255)",
          pointHoverBorderColor: "rgb(144, 0, 255)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 4,
          data: wh95LCI,
          type: "line",
          order: 2,
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        xAxes: [
          {
            ticks: {
              //suggestedMax: 13,
              //beginAtZero: true,
            },
          },
        ],
      },

      title: {
        display: true,
        text: "Demand Forecast over a Period",
        fontSize: 20,
      },
    },
  });

  //-------------Winter's Error Frequency Distribution-------------
  let whErrorValSort = whError_Et;
  whErrorValSort = whErrorValSort.sort((a, b) => a - b); //sort ascending

  for (let i = 0; i < whError_Et.length; i++) {
    whErrorValSort[i] = Math.round(whErrorValSort[i]);
  }

  let whErrorCount = 0;
  let whErrorFreqArr = [];
  let whErrorValArr = [];
  counter = 0;
  //populate error values array
  for (let i = 0; i < whErrorValSort.length; i++) {
    //if error value not already in array, add it
    if (whErrorValArr.includes(whErrorValSort[i]) === false) {
      whErrorValArr[counter] = whErrorValSort[i];
      counter++;
    }
  }

  //determine the error value frequency in SES error value sort array
  for (let i = 0; i < whErrorValArr.length; i++) {
    whErrorCount = 0;
    for (let j = 0; j < whErrorValSort.length; j++) {
      if (whErrorValSort[j] === whErrorValArr[i]) {
        whErrorCount++;
      }
    }
    whErrorFreqArr[i] = whErrorCount;
  }

  ///------------------------------------------------------------

  //GRAPH - Winter's Error Distribution

  document.getElementById("whErrorDist").style.backgroundColor = "white";
  document.getElementById("whErrorDist").style.outlineStyle = "solid";
  document.getElementById("whErrorDist").style.outlineColor = "black";
  document.getElementById("whErrorDist").style.outlineWidth = "2px";

  const ctx9 = document.getElementById("whErrorDist").getContext("2d");

  //global graph configurations
  Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartwhError = new Chart(ctx9, {
    // The type of chart we want to create
    type: "bar", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: whErrorValArr,
      datasets: [
        {
          label: "Error Distribution",
          fill: true,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: whErrorFreqArr,
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        xAxes: [
          {
            ticks: {},
          },
        ],
      },

      title: {
        display: true,
        text: "Winter's Forecast Error Distribution ",
        fontSize: 20,
      },
    },
  });

  //______________________________________________
  //---Creating the Winter's Error Measure Table

  let whLowTS = Infinity;
  let whHighTS = -1000000000;
  let whTSsum = 0;
  let whTSavg;
  for (let i = 0; i < whDataTSt.length; i++) {
    if (whDataTSt[i] < whLowTS) {
      whLowTS = whDataTSt[i];
    }
    if (whDataTSt[i] > whHighTS) {
      whHighTS = whDataTSt[i];
    }
    whTSsum = whTSsum + whDataTSt[i];
  }
  whTSavg = whTSsum / whDataTSt.length;
  let whTSrange = whLowTS.toFixed(2) + " to " + whHighTS.toFixed(2);
  const whTableBody = document.getElementById("whTableData");
  last = demand.length - 1;
  let whDataHtml = `<tr><td class="td">${whMeanSqrdError_MSEt[last].toFixed(
    2
  )}</td><td class="td">${whDataMAD[last].toFixed(
    2
  )}</td><td class="td">${wh_MAPEt[last].toFixed(
    2
  )}</td><td class="td">${whTSrange}</td><td class="td">${whTSavg.toFixed(
    2
  )}</td>`;
  whTableBody.innerHTML = whDataHtml; //sets the table contents equal to the sesDataHtml

  document.getElementById("whTableData").style.width = "100%";

  //---------------------------------
  //Winter's Error Monitoring
  //---------------------------------

  let whErrorCCstd = Math.sqrt(whMeanSqrdError_MSEt[demand.length - 1]).toFixed(
    2
  );
  let wh3sigma = 3 * whErrorCCstd;

  let whZeroBaseline = [];
  let whUCL = [];
  let whLCL = [];
  let whErrorCC = [];

  //populate CC arrays:
  for (let i = 0; i < demand.length; i++) {
    whZeroBaseline[i] = 0;
    whUCL[i] = wh3sigma.toFixed(2);
    whLCL[i] = -wh3sigma.toFixed(2);
    //Et
    whErrorCC[i] = whForecast_Ft[i] - demand[i];
  }


  //Graph - SES Control Chart
  document.getElementById("whControlChart").style.backgroundColor = "white";
  document.getElementById("whControlChart").style.outlineStyle = "solid";
  document.getElementById("whControlChart").style.outlineColor = "black";
  document.getElementById("whControlChart").style.outlineWidth = "2px";
  document.getElementById("whUCL").innerText = wh3sigma.toFixed(2);
  document.getElementById("whLCL").innerText = -wh3sigma.toFixed(2);

  const ctx10 = document.getElementById("whControlChart").getContext("2d");

  //global graph configurations
  //Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartwhCC = new Chart(ctx10, {
    // The type of chart we want to create
    type: "line", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: period,
      datasets: [
        {
          label: "Error",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 2,
          pointHitRadius: 10,
          data: whErrorCC, //sesErrorDist,
        },
        {
          label: "Baseline",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(28, 3, 252)",
          borderColor: "rgb(28, 3, 252)",
          borderCapStyle: "round",
          borderDash: [5, 5],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(28, 3, 252)",
          pointBackgroundColor: "rgb(28, 3, 252)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(28, 3, 252)",
          pointHoverBorderColor: "rgb(28, 3, 252)",
          pointHoverBorderWidth: 1,
          pointRadius: 0,
          pointHitRadius: 10,
          data: whZeroBaseline,
          type: "line",
          //order: 1, //on top
        },
        {
          label: "UCL",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 1,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: whUCL,
          type: "line",
          //order: 1, //on top
        },
        {
          label: "LCL",
          fill: false,
          //lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: whLCL,
          type: "line",
          //order: 1, //on top
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {},
          },
        ],
        xAxes: [
          {
            ticks: {},
          },
        ],
      },

      title: {
        display: true,
        text: "Winter's Control Chart (3σ) ",
        fontSize: 20,
      },
    },
  });

  //---------------------------------
  //---------------------------------
  //Winter's TS section of error monitoring

  //Graph - Winter's TS Chart

  document.getElementById("whTSChart").style.backgroundColor = "white";
  document.getElementById("whTSChart").style.outlineStyle = "solid";
  document.getElementById("whTSChart").style.outlineColor = "black";
  document.getElementById("whTSChart").style.outlineWidth = "2px";

  const ctx11 = document.getElementById("whTSChart").getContext("2d");

  //global graph configurations
  //Chart.defaults.scale.ticks.beginAtZero = true;
  //Chart.defaults.global.animation.duration = 1000;

  let chartwhTSC = new Chart(ctx11, {
    // The type of chart we want to create
    type: "line", //verander dalk weer terug na 'n bar?

    // The data for our dataset
    data: {
      labels: period,
      datasets: [
        {
          label: "TS",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 107, 3)",
          borderColor: "rgb(252, 107, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 107, 3)",
          pointBackgroundColor: "rgb(252, 107, 3)",
          pointBorderWidth: 2,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 107, 3)",
          pointHoverBorderColor: "rgb(252, 165, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 3,
          pointHitRadius: 10,
          data: whDataTSt,
        },
        {
          label: "Baseline",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(28, 3, 252)",
          borderColor: "rgb(28, 3, 252)",
          borderCapStyle: "round",
          borderDash: [5, 5],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(28, 3, 252)",
          pointBackgroundColor: "rgb(28, 3, 252)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(28, 3, 252)",
          pointHoverBorderColor: "rgb(28, 3, 252)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: whZeroBaseline,
          type: "line",
        },
        {
          label: "UCL",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: tsUCL,
          type: "line",
        },
        {
          label: "LCL",
          fill: false,
          lineTension: 0, //remove to smooth out the graph
          backgroundColor: "rgb(252, 3, 3)",
          borderColor: "rgb(252, 3, 3)",
          borderCapStyle: "round",
          borderDash: [],
          borderDashOffset: 0.0,
          borderJoinStyle: "miter",
          pointBorderColor: "rgb(252, 3, 3)",
          pointBackgroundColor: "rgb(252, 3, 3)",
          pointBorderWidth: 3,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: "rgb(252, 3, 3)",
          pointHoverBorderColor: "rgb(252, 3, 3)",
          pointHoverBorderWidth: 2,
          pointRadius: 0,
          pointHitRadius: 10,
          data: tsLCL,
          type: "line",
        },
      ],
    },
    // Configuration options go here
    options: {
      scales: {
        yAxes: [
          {
            ticks: {
              beginAtZero: true,
            },
          },
        ],
        xAxes: [
          {
            ticks: {},
          },
        ],
      },

      title: {
        display: true,
        text: "Winter's TS Chart ",
        fontSize: 20,
      },
    },
  });

  //---------------------------------
  //_________Results Summary_________
  //---------------------------------
  //______________________________________________

  //Settin up the Winter's Model demand forecast values

  let wDemandValues = [];
  for (let i = 0; i < 12; i++) {
    if (i < optwhPeriod) {
      wDemandValues[i] = whForecast_Ft[demand.length + i].toFixed(2);
    } else {
      wDemandValues[i] = "-";
    }
  }

  //---Creating the Forecast Summary Table
  const sumForcTableBody = document.getElementById("sumForcTableData");
  let sumForcDataHtml = `<tr style="background-color: lightgray;"><td style="background-color:  rgb(175, 174, 174);">Forecasting method</td><td>${
    demand.length + 1
  }</td><td>${demand.length + 2}</td><td>${demand.length + 3}</td><td>${
    demand.length + 4
  }</td><td>${demand.length + 5}</td><td>${demand.length + 6}</td><td>${
    demand.length + 7
  }</td><td>${demand.length + 8}</td><td>${demand.length + 9}</td><td>${
    demand.length + 10
  }</td><td>${demand.length + 11}</td><td>${demand.length + 12}</td>
    <tr><td style="background-color: lightgray;">SES</td><td class="td">${SESforecast_Ft[
      SESforecast_Ft.length - 1
    ].toFixed(
      2
    )}</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td></tr>
    <tr><td style="background-color: lightgray;">Holt's Model</td><td class="td">${holtForecast_Ft[
      holtForecast_Ft.length - 4
    ].toFixed(2)}</td><td class="td">${holtForecast_Ft[
    holtForecast_Ft.length - 3
  ].toFixed(2)}</td><td class="td">${holtForecast_Ft[
    holtForecast_Ft.length - 2
  ].toFixed(2)}</td><td class="td">${holtForecast_Ft[
    holtForecast_Ft.length - 1
  ].toFixed(
    2
  )}</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td><td class="td">-</td></tr>
  <tr><td style="background-color: lightgray;">Winter's Model</td><td class="td">${
    wDemandValues[0]
  }</td><td class="td">${wDemandValues[1]}</td><td class="td">${
    wDemandValues[2]
  }</td><td class="td">${wDemandValues[3]}</td><td class="td">${
    wDemandValues[4]
  }</td><td class="td">${wDemandValues[5]}</td><td class="td">${
    wDemandValues[6]
  }</td><td class="td">${wDemandValues[7]}</td><td class="td">${
    wDemandValues[8]
  }</td><td class="td">${wDemandValues[9]}</td><td class="td">${
    wDemandValues[10]
  }</td><td class="td">${wDemandValues[11]}</td>`;
  sumForcTableBody.innerHTML = sumForcDataHtml; //sets the table contents equal to the sesDataHtml

  document.getElementById("sumForcTableData").style.width = "100%";

  //______________________________________________
  //---Creating the PCI Summary Tables
  //________SES________
  let sesUI50 = [],
    sesLI50 = [],
    holtUI50 = [],
    holtLI50 = [],
    whUI50 = [],
    whLI50 = [],
    sesUI68 = [],
    sesLI68 = [],
    holtUI68 = [],
    holtLI68 = [],
    whUI68 = [],
    whLI68 = [],
    sesUI75 = [],
    sesLI75 = [],
    holtUI75 = [],
    holtLI75 = [],
    whUI75 = [],
    whLI75 = [],
    sesUI80 = [],
    sesLI80 = [],
    holtUI80 = [],
    holtLI80 = [],
    whUI80 = [],
    whLI80 = [],
    sesUI85 = [],
    sesLI85 = [],
    holtUI85 = [],
    holtLI85 = [],
    whUI85 = [],
    whLI85 = [],
    sesUI90 = [],
    sesLI90 = [],
    holtUI90 = [],
    holtLI90 = [],
    whUI90 = [],
    whLI90 = [],
    sesUI95 = [],
    sesLI95 = [],
    holtUI95 = [],
    holtLI95 = [],
    whUI95 = [],
    whLI95 = [],
    sesUI98 = [],
    sesLI98 = [],
    holtUI98 = [],
    holtLI98 = [],
    whUI98 = [],
    whLI98 = [],
    sesUI99 = [],
    sesLI99 = [],
    holtUI99 = [],
    holtLI99 = [],
    whUI99 = [],
    whLI99 = [];

  //populate SES arrays
  for (let i = 0; i < 1; i++) {
    sesUI50[i] = (
      SESforecast_Ft[demand.length] +
      0.674 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesLI50[i] = (
      SESforecast_Ft[demand.length] -
      0.674 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesUI68[i] = (
      SESforecast_Ft[demand.length] +
      1 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesLI68[i] = (
      SESforecast_Ft[demand.length] -
      1 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesUI75[i] = (
      SESforecast_Ft[demand.length] +
      1.15 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesLI75[i] = (
      SESforecast_Ft[demand.length] -
      1.15 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesUI80[i] = (
      SESforecast_Ft[demand.length] +
      1.282 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesLI80[i] = (
      SESforecast_Ft[demand.length] -
      1.282 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesUI85[i] = (
      SESforecast_Ft[demand.length] +
      1.44 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesLI85[i] = (
      SESforecast_Ft[demand.length] -
      1.44 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesUI90[i] = (
      SESforecast_Ft[demand.length] +
      1.645 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesLI90[i] = (
      SESforecast_Ft[demand.length] -
      1.645 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesUI95[i] = (
      SESforecast_Ft[demand.length] +
      1.96 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesLI95[i] = (
      SESforecast_Ft[demand.length] -
      1.96 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesUI98[i] = (
      SESforecast_Ft[demand.length] +
      2.326 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesLI98[i] = (
      SESforecast_Ft[demand.length] -
      2.326 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesUI99[i] = (
      SESforecast_Ft[demand.length] +
      2.576 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    sesLI99[i] = (
      SESforecast_Ft[demand.length] -
      2.576 * Math.sqrt(SESmeanSqrdError_MSEt[SESmeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
  }

  //populate holt arrays
  for (let i = 0; i < holtForecast_Ft.length - demand.length; i++) {
    holtUI50[i] = (
      holtForecast_Ft[demand.length + i] +
      0.674 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtLI50[i] = (
      holtForecast_Ft[demand.length + i] -
      0.674 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtUI68[i] = (
      holtForecast_Ft[demand.length + i] +
      1 * Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtLI68[i] = (
      holtForecast_Ft[demand.length + i] -
      1 * Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtUI75[i] = (
      holtForecast_Ft[demand.length + i] +
      1.15 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtLI75[i] = (
      holtForecast_Ft[demand.length + i] -
      1.15 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtUI80[i] = (
      holtForecast_Ft[demand.length + i] +
      1.282 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtLI80[i] = (
      holtForecast_Ft[demand.length + i] -
      1.282 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtUI85[i] = (
      holtForecast_Ft[demand.length + i] +
      1.44 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtLI85[i] = (
      holtForecast_Ft[demand.length + i] -
      1.44 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtUI90[i] = (
      holtForecast_Ft[demand.length + i] +
      1.645 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtLI90[i] = (
      holtForecast_Ft[demand.length + i] -
      1.645 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtUI95[i] = (
      holtForecast_Ft[demand.length + i] +
      1.96 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtLI95[i] = (
      holtForecast_Ft[demand.length + i] -
      1.96 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtUI98[i] = (
      holtForecast_Ft[demand.length + i] +
      2.326 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtLI98[i] = (
      holtForecast_Ft[demand.length + i] -
      2.326 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtUI99[i] = (
      holtForecast_Ft[demand.length + i] +
      2.576 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    holtLI99[i] = (
      holtForecast_Ft[demand.length + i] -
      2.576 *
        Math.sqrt(holtMeanSqrdError_MSEt[holtMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
  }

  //populate winter arrays
  for (let i = 0; i < whForecast_Ft.length - demand.length; i++) {
    whUI50[i] = (
      whForecast_Ft[demand.length + i] +
      0.674 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whLI50[i] = (
      whForecast_Ft[demand.length + i] -
      0.674 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whUI68[i] = (
      whForecast_Ft[demand.length + i] +
      1 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whLI68[i] = (
      whForecast_Ft[demand.length + i] -
      1 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whUI75[i] = (
      whForecast_Ft[demand.length + i] +
      1.15 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whLI75[i] = (
      whForecast_Ft[demand.length + i] -
      1.15 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whUI80[i] = (
      whForecast_Ft[demand.length + i] +
      1.282 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whLI80[i] = (
      whForecast_Ft[demand.length + i] -
      1.282 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whUI85[i] = (
      whForecast_Ft[demand.length + i] +
      1.44 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whLI85[i] = (
      whForecast_Ft[demand.length + i] -
      1.44 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whUI90[i] = (
      whForecast_Ft[demand.length + i] +
      1.645 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whLI90[i] = (
      whForecast_Ft[demand.length + i] -
      1.645 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whUI95[i] = (
      whForecast_Ft[demand.length + i] +
      1.96 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whLI95[i] = (
      whForecast_Ft[demand.length + i] -
      1.96 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whUI98[i] = (
      whForecast_Ft[demand.length + i] +
      2.326 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whLI98[i] = (
      whForecast_Ft[demand.length + i] -
      2.326 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whUI99[i] = (
      whForecast_Ft[demand.length + i] +
      2.576 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
    whLI99[i] = (
      whForecast_Ft[demand.length + i] -
      2.576 * Math.sqrt(whMeanSqrdError_MSEt[whMeanSqrdError_MSEt.length - 1])
    ).toFixed(2);
  }

  //Construct SES PCI Table
  const sesSumPCItableBody = document.getElementById("sesSumPCItableData");
  let sesSumPCIdataHtml = ``;
  for (let i = 0; i < SESforecast_Ft.length - demand.length; i++) {
    sesSumPCIdataHtml += `<tr><td style="background-color: lightgray;">${SESforecast_Ft.length}</td><td class="td">${sesLI50[i]} to ${sesUI50[i]}</td><td class="td">${sesLI68[i]} to ${sesUI68[i]}</td><td class="td">${sesLI75[i]} to ${sesUI75[i]}</td><td class="td">${sesLI80[i]} to ${sesUI80[i]}</td><td class="td">${sesLI85[i]} to ${sesUI85[i]}</td><td class="td">${sesLI90[i]} to ${sesUI90[i]}</td><td class="td">${sesLI95[i]} to ${sesUI95[i]}</td><td class="td">${sesLI98[i]} to ${sesUI98[i]}</td><td class="td">${sesLI99[i]} to ${sesUI99[i]}</td></tr>`;
  }
  sesSumPCItableBody.innerHTML = sesSumPCIdataHtml; //sets the table contents equal to the sesDataHtml

  //Construct Holt PCI Table
  const holtSumPCItableBody = document.getElementById("holtSumPCItableData");
  let holtSumPCIdataHtml = ``;
  for (let i = 1; i <= holtForecast_Ft.length - demand.length; i++) {
    holtSumPCIdataHtml += `<tr><td style="background-color: lightgray;">${
      demand.length + i
    }</td><td class="td">${holtLI50[i - 1]} to ${
      holtUI50[i - 1]
    }</td><td class="td">${holtLI68[i - 1]} to ${
      holtUI68[i - 1]
    }</td><td class="td">${holtLI75[i - 1]} to ${
      holtUI75[i - 1]
    }</td><td class="td">${holtLI80[i - 1]} to ${
      holtUI80[i - 1]
    }</td><td class="td">${holtLI85[i - 1]} to ${
      holtUI85[i - 1]
    }</td><td class="td">${holtLI90[i - 1]} to ${
      holtUI90[i - 1]
    }</td><td class="td">${holtLI95[i - 1]} to ${
      holtUI95[i - 1]
    }</td><td class="td">${holtLI98[i - 1]} to ${
      holtUI98[i - 1]
    }</td><td class="td">${holtLI99[i - 1]} to ${holtUI99[i - 1]}</td></tr>`;
  }
  holtSumPCItableBody.innerHTML = holtSumPCIdataHtml; //sets the table contents equal to the sesDataHtml

  //Construct Winter PCI Table
  const whSumPCItableBody = document.getElementById("whSumPCItableData");
  let whSumPCIdataHtml = ``;
  for (let i = 1; i <= whForecast_Ft.length - demand.length; i++) {
    whSumPCIdataHtml += `<tr><td style="background-color: lightgray;">${
      demand.length + i
    }</td><td class="td">${whLI50[i - 1]} to ${
      whUI50[i - 1]
    }</td><td class="td">${whLI68[i - 1]} to ${
      whUI68[i - 1]
    }</td><td class="td">${whLI75[i - 1]} to ${
      whUI75[i - 1]
    }</td><td class="td">${whLI80[i - 1]} to ${
      whUI80[i - 1]
    }</td><td class="td">${whLI85[i - 1]} to ${
      whUI85[i - 1]
    }</td><td class="td">${whLI90[i - 1]} to ${
      whUI90[i - 1]
    }</td><td class="td">${whLI95[i - 1]} to ${
      whUI95[i - 1]
    }</td><td class="td">${whLI98[i - 1]} to ${
      whUI98[i - 1]
    }</td><td class="td">${whLI99[i - 1]} to ${whUI99[i - 1]}</td></tr>`;
  }
  whSumPCItableBody.innerHTML = whSumPCIdataHtml; //sets the table contents equal to the sesDataHtml

  //
  //______________________________________________
  //---Creating the Error Measure Summary Table

  /*color: darkgreen;
color: greenyellow;
color: orange;
color: rgb(230, 90, 90);
color:darkred;*/
  let accColStr = [
    "limegreen",
    "greenyellow",
    "orange",
    "rgb(230, 90, 90)",
    "red",
  ];
  let accTabStr = [];
  let accArr = [];

  //
  //SES
  if (SES_MAPEt[last] < 10) {
    accArr[0] = accColStr[0];
    accTabStr[0] = "Excellent";
  }
  if (SES_MAPEt[last] >= 10 && SES_MAPEt[last] < 20) {
    accArr[0] = accColStr[1];
    accTabStr[0] = "Good";
  }
  if (SES_MAPEt[last] >= 20 && SES_MAPEt[last] < 50) {
    accArr[0] = accColStr[2];
    accTabStr[0] = "Reasonable";
  }
  if (SES_MAPEt[last] >= 50 && SES_MAPEt[last] < 80) {
    accArr[0] = accColStr[3];
    accTabStr[0] = "Weak";
  }
  if (SES_MAPEt[last] >= 80) {
    accArr[0] = accColStr[4];
    accTabStr[0] = "Unsuitable";
  }
  //
  //Holt
  if (holt_MAPEt[last] < 10) {
    accArr[1] = accColStr[0];
    accTabStr[1] = "Excellent";
  }
  if (holt_MAPEt[last] >= 10 && holt_MAPEt[last] < 20) {
    accArr[1] = accColStr[1];
    accTabStr[1] = "Good";
  }
  if (holt_MAPEt[last] >= 20 && holt_MAPEt[last] < 50) {
    accArr[1] = accColStr[2];
    accTabStr[1] = "Reasonable";
  }
  if (holt_MAPEt[last] >= 50 && holt_MAPEt[last] < 80) {
    accArr[1] = accColStr[3];
    accTabStr[1] = "Weak";
  }
  if (holt_MAPEt[last] >= 80) {
    accArr[1] = accColStr[4];
    accTabStr[1] = "Unsuitable";
  }
  //
  //Winter
  if (wh_MAPEt[last] < 10) {
    accArr[2] = accColStr[0];
    accTabStr[2] = "Excellent";
  }
  if (wh_MAPEt[last] >= 10 && wh_MAPEt[last] < 20) {
    accArr[2] = accColStr[1];
    accTabStr[2] = "Good";
  }
  if (wh_MAPEt[last] >= 20 && wh_MAPEt[last] < 50) {
    accArr[2] = accColStr[2];
    accTabStr[2] = "Reasonable";
  }
  if (wh_MAPEt[last] >= 50 && wh_MAPEt[last] < 80) {
    accArr[2] = accColStr[3];
    accTabStr[2] = "Weak";
  }
  if (wh_MAPEt[last] >= 80) {
    accArr[2] = accColStr[4];
    accTabStr[2] = "Unsuitable";
  }

  const sumErrTableBody = document.getElementById("sumErrTableData");
  let sumErrDataHtml = `<tr><td style="background-color: lightgray;">SES</td><td class="td">${SESmeanSqrdError_MSEt[
    last
  ].toFixed(2)}</td><td class="td">${SESdataMAD[last].toFixed(
    2
  )}</td><td class="td">${SES_MAPEt[last].toFixed(
    2
  )}</td><td class="td">${sesTSrange}</td><td class="td">${sesTSavg.toFixed(
    2
  )}</td><td style="background-color: ${accArr[0]};">${
    accTabStr[0]
  }</td></tr><tr><td style="background-color: lightgray;">Holt's Model</td><td class="td">${holtMeanSqrdError_MSEt[
    last
  ].toFixed(2)}</td><td class="td">${holtDataMAD[last].toFixed(
    2
  )}</td><td class="td">${holt_MAPEt[last].toFixed(
    2
  )}</td><td class="td">${holtTSrange}</td><td class="td">${holtTSavg.toFixed(
    2
  )}</td><td style="background-color: ${accArr[1]};">${
    accTabStr[1]
  }</td></tr><tr><td style="background-color: lightgray;">Winter's Model</td><td class="td">${whMeanSqrdError_MSEt[
    last
  ].toFixed(2)}</td><td class="td">${whDataMAD[last].toFixed(
    2
  )}</td><td class="td">${wh_MAPEt[last].toFixed(
    2
  )}</td><td class="td">${whTSrange}</td><td class="td">${whTSavg.toFixed(
    2
  )}</td><td style="background-color: ${accArr[2]};">${accTabStr[2]}</td></tr>`;
  sumErrTableBody.innerHTML = sumErrDataHtml; //sets the table contents equal to the sesDataHtml

  document.getElementById("sumErrTableData").style.width = "100%";
  //

  //_____________New Kurtosis test with correct error distr._____________
  //sesErrorCC
  //holtErrorCC
  //whErrorCC
  ///-----------test----------
  let sesKurtosis = 0,
    holtKurtosis = 0,
    whKurtosis = 0;
  let sesErrorSum = 0,
    holtErrorSum = 0,
    whErrorSum = 0;
  let sesErrorAvg = 0,
    holtErrorAvg = 0,
    whErrorAvg = 0;
  let sesAvgDifSum = 0,
    holtAvgDifSum = 0,
    whAvgDifSum = 0;
  let sesErrorStdv = 0,
    holtErrorStdv = 0,
    whErrorStdv = 0;
  let sesAvgDifSumPow4 = 0,
    holtAvgDifSumPow4 = 0,
    whAvgDifSumPow4 = 0;
  let n = demand.length;


  // Determine sum values to determine Avg
  for (let i = 0; i < n; i++) {
    //sum
    sesErrorSum += sesErrorCC[i];
    holtErrorSum += holtErrorCC[i];
    whErrorSum += whErrorCC[i];
  }
  //avg
  sesErrorAvg = sesErrorSum / n;
  holtErrorAvg = holtErrorSum / n;
  whErrorAvg = whErrorSum / n;


  // Determine sum values to determine Stdv
  for (let i = 0; i < n; i++) {
    sesAvgDifSum += Math.pow(sesErrorCC[i] - sesErrorAvg, 2);
    holtAvgDifSum += Math.pow(holtErrorCC[i] - holtErrorAvg, 2);
    whAvgDifSum += Math.pow(whErrorCC[i] - whErrorAvg, 2);
    sesAvgDifSumPow4 += Math.pow(sesErrorCC[i] - sesErrorAvg, 4);
    holtAvgDifSumPow4 += Math.pow(holtErrorCC[i] - holtErrorAvg, 4);
    whAvgDifSumPow4 += Math.pow(whErrorCC[i] - whErrorAvg, 4);
  }

  //
  //stdv (sample)
  sesErrorStdv = Math.sqrt(sesAvgDifSum / (n - 1));
  holtErrorStdv = Math.sqrt(holtAvgDifSum / (n - 1));
  whErrorStdv = Math.sqrt(whAvgDifSum / (n - 1));

  //
  //kurtosis:
  //ses
  sesKurtosis =
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) *
      (sesAvgDifSumPow4 / Math.pow(sesErrorStdv, 4)) -
    (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  //holt
  holtKurtosis =
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) *
      (holtAvgDifSumPow4 / Math.pow(holtErrorStdv, 4)) -
    (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  //winter
  whKurtosis =
    ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) *
      (whAvgDifSumPow4 / Math.pow(whErrorStdv, 4)) -
    (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));


  document.getElementById("sesKurtosis").innerText = sesKurtosis.toFixed(3);
  document.getElementById("holtKurtosis").innerText = holtKurtosis.toFixed(3);
  document.getElementById("whKurtosis").innerText = whKurtosis.toFixed(3);

  ///-----------test----------

  //
  //________Indicating the best model according to MAPE%________

  //Set the element to indicate the correct name
  let bestModelArr = [];
  let bestModel = "";

  bestModelArr[0] = SES_MAPEt[SES_MAPEt.length - 1];
  bestModelArr[1] = holt_MAPEt[holt_MAPEt.length - 1];
  bestModelArr[2] = wh_MAPEt[wh_MAPEt.length - 1];

  if (
    SES_MAPEt[SES_MAPEt.length - 1] < holt_MAPEt[holt_MAPEt.length - 1] &&
    SES_MAPEt[SES_MAPEt.length - 1] < wh_MAPEt[wh_MAPEt.length - 1]
  ) {
    bestModel = "SES";
  }
  if (
    holt_MAPEt[holt_MAPEt.length - 1] < SES_MAPEt[SES_MAPEt.length - 1] &&
    holt_MAPEt[holt_MAPEt.length - 1] < wh_MAPEt[wh_MAPEt.length - 1]
  ) {
    bestModel = "Holt's Model";
  }
  if (
    wh_MAPEt[wh_MAPEt.length - 1] < SES_MAPEt[SES_MAPEt.length - 1] &&
    wh_MAPEt[wh_MAPEt.length - 1] < holt_MAPEt[holt_MAPEt.length - 1]
  ) {
    bestModel = "Winter's Model";
  }

  document.getElementById("bestModelName").innerHTML = bestModel;

  //
  //-------------------D3 data format fiddling--------------------
  //replicate d3 data (excluding columns array)
  let f = [];
  for (let i = 0; i < rowValues.length; i++) {
    f[i] = { Period: rowValues[i][0], Demand: rowValues[i][1] };
  }
  //console.log(f);
  //-------------------D3 data format fiddling--------------------
};
var parseCsv = new uploadDealcsv();
parseCsv.getCsv();

//____Representing a data table in JS____

//This returns a promise when the data has been loaded
//  callback accpets data as the argument
//      body of the function console.log(data) to see if it works

//d3.csv(document.getElementById("fileinput") + "");

/*
//d3.csv("data.csv")
.then((data) => {
  //parses string values generated from reading the csv to float
  data.forEach((d) => {
    d.population = +d.population * 1000; //times 1000 to get true population
  });
  render(data);
});
*/
