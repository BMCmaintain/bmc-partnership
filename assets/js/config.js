/* =====================================================================
   BMC Partnership Agreement – settings
   ===================================================================== */
window.BMC_CONFIG = {

  /* Paste the Google Apps Script "Web app URL" between the quotes.
     It looks like: https://script.google.com/macros/s/AKfy.../exec        */
  sendUrl: "https://script.google.com/macros/s/AKfycbx-k_3Uko0UGQwEk2XRl5VARw0a37ibB96yWjo7HvtA8MuQ3RBSElsqIqQiZZmcMIRv/exec",

  /* Reactive rate card shown on the Invoicing step.
     Edit the figures here when rates change – nothing else needs touching. */
  rates: {
    title: "Premier Reactive Non-Tiered inc. 1st Hr Rates",
    effective: "01/10/2026",
    columns: ["Mon – Fri, 8am – 5pm", "5pm – 8am, weekends & public holidays"],
    groups: [
      { name: "General Trades", rows: [
        ["Arrival fee – inclusive of call-out, travel & 1st hour on site", "£110.00", "£170.00"],
        ["Hourly rate",                                                  "£46.00",  "£65.00"],
        ["Day rate – 8 hrs labour only",                                 "£375.00", "N/A"]
      ]},
      { name: "Electricians", rows: [
        ["Arrival fee – inclusive of call-out, travel & 1st hour on site", "£125.00", "£185.00"],
        ["Hourly rate",                                                  "£55.00",  "£75.00"],
        ["Day rate – 8 hrs labour only",                                 "£425.00", "N/A"]
      ]}
    ],
    uplifts: ["Materials uplift 15%", "Plant uplift 15%", "Sub-contractor uplift 20%"],
    terms: [
      "The rates above apply to all our directly employed operatives regardless of trade. They do not include drain jetting, roller shutters or fire alarm engineers; these services are provided by BMC using specialist sub-contractors.",
      "The arrival fee is subject to the locations of your sites. We reserve the right to discuss additional travel charges at the appropriate hourly rate should any locations require it. If we win the work for all of your sites in our direct labour footprint (in red on the map), we will not charge any additional travel for the arrival fee.",
      "There is one arrival fee per job regardless of the number of visits, but we would charge this fee for each operative if multiple operatives were required due to the nature or requirements of a particular job. Return visits will only have travel charges applied.",
      "There is a minimum order value of the arrival fee and 1 hour on site on all jobs.",
      "Rates are calculated in multiples of half an hour."
    ]
  }
};
