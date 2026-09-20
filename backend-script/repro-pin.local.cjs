const { loadGas, baseState, post, get } = require("./gasHarness.cjs");
const mk = () => baseState({ Config: [["key","value"],["exam_pin","1234"],["admin_password","rahasia"],["exam_duration",90]] });
const pinRow = (st) => st.Config.find(r => r[0] === "exam_pin");

let st = mk(); let gas = loadGas(st);
console.log("CASE1 getConfig has exam_pin?      :", "exam_pin" in get(gas,"getConfig").data);
console.log("CASE1 getExamSummary has exam_pin? :", "exam_pin" in get(gas,"getExamSummary").data);

st = mk(); gas = loadGas(st);
console.log("CASE2 updateConfig 5678            :", JSON.stringify(post(gas,"updateConfig",{key:"exam_pin",value:"5678"})));
console.log("CASE2 sheet row                    :", JSON.stringify(pinRow(st)));

st = mk(); gas = loadGas(st);
post(gas,"updateConfig",{key:"exam_pin",value:"0001"});
console.log("CASE4 leading zero row             :", JSON.stringify(pinRow(st)), "typeof:", typeof pinRow(st)[1]);

st = mk(); gas = loadGas(st);
console.log("CASE5 '123'                        :", JSON.stringify(post(gas,"updateConfig",{key:"exam_pin",value:"123"})));
console.log("CASE5 'abcd'                       :", JSON.stringify(post(gas,"updateConfig",{key:"exam_pin",value:"abcd"})));
console.log("CASE5 sheet row after invalids     :", JSON.stringify(pinRow(st)));
