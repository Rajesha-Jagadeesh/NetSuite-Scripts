/**
 * @NApiVersion 2.1
 * @NScriptType MapReduceScript
 */

/*
The mapreduce script can be sheduled to convert the lead into customer record and create a sales order to the respective with the static item (1234)
*/
define(['N/search', 'N/record', 'N/log'], function(search, record, log){
  function handleError(error, stage){
    log.error("ERROR ON STAGE" + stage, JSON.stringify(error));
    log.debug("YE")
  }

  function getInputData (context){
    try {
      return search.create({
        type: search.Type.LEAD,
        filters:[
          ['status', 'anyof', "LEAD"],
          "AND",
          ['inactive', 'is', false]
        ],
        columns: ['internalid']
      })
    } catch (error) {
      handleError(error, 'getInputData');
      return [];
    }
  }
  
  function map(mapContext) {
    try {
      const response = JSON.parse(mapContext.value);
      const leadId = response.id;

      mapContext.write({
        key: leadId,
        value: leadId
      })
    } catch (error) {
      handleError(error, 'map')
    }
  }

  function reduce(reduceContext) {
    try {
      const leadId = reduceContext.key;
      const customerRec = record.transform({
        fromType: record.Type.LEAD,
        toType: record.Type.CUSTOMER,
        fromId: leadId,
        isDynamic: true
      })
      const customerId = customerRec.save();
      const salesOrderRec = record.create({
        type: record.Type.SALESORDER,
        isDynamic: true
      })
      salesOrderRec.setValue({fieldId: "entity", value: customerId});
      salesOrderRec.setSublistValue({
        sublistId: 'item',
        fieldId: 'item',
        line: 0, // line index of the item that are inserting
        value: 1234 // internal id of the item that inserting
      })
      salesOrderRec.save();
    } catch (error) {
      handleError(error, 'reduce')
    }
  }

  function summarize(summarizeContext){
    try {
      log.debug("SUMMARIZE RESULTS", JSON.stringify({
        totalProcessed: summarizeContext.inputSummary.totalKeyProcessed,
        errors: summarizeContext.inputSummary.errors
      }))
    } catch (error) {
      handleError(error, "summarize");
    }
  }

  return{
    getInputData: getInputData,
    map: map,
    reduce: reduce,
    summarize: summarize
  }
})