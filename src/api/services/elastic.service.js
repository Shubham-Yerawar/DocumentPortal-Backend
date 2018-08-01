const axios = require('axios');

const {
  elasticSearch: { documentIndex, host },
} = require('../../config/vars');

const ElasticService = function ElasticService() {
  this.addDataToDocument = async (docId, data) => {
    const body = { doc: { user_defined_data: data } };
    const headUrl = `${host}/${documentIndex}/doc/${docId}`;
    const postUrl = `${host}/${documentIndex}/doc/${docId}/_update`;
    // console.log(headUrl,postUrl,body);

    // we need to check if the document has completed indexing by fscrawler and then update its info
    try {
      await axios.head(headUrl); // to check if document exists in ES
      console.log('found document in ES');

      try {
        await axios.post(postUrl, body);
        // console.log('done posting :',body,' to ES for :',docId);
        return true; // document successfully indexed
      } catch (error) {
        // TODO: error handling
        console.log('error adding documentInfo to elastic .. some error at elastic side :');
        return false;
      }
    } catch (error) {
      console.log('error adding documentInfo to elastic.. may be fscrawler is still working :');
      return false; // document yet to be indexed .. maybe fscrawler is still working
    }
  };
  // end of addDataToDocument

  this.getDocuments = async (query,size = 8,offset = 0) => {
    const url = `${host}/${documentIndex}/_search`;
    const body = {
      query: {
        query_string: {
          query: query,
        },
      },
      _source: ['user_defined_data', 'file'],
      from : offset,
      size: size
    };
    try {
      const response = await axios.post(url, body).then(response => response.data.hits);
      // console.log(response);
      return response;
    } catch (error) {
      console.log('error fetching document from elastic');
    }
  };
  // end of getDocuments
};
// end of ElasticService

module.exports = new ElasticService();

/**
 *
 * Going note:
 *
 * I am trying to check if a document has been indexed by fscrawler in ES.
 * for larger sized docs , fscrawler takes ample amount of time and till then
 * my indexing service tries to add data to that un-indexed document , thus giving an error
 * and my current implementation goes into infinite loop (before adding the login of pending queue).
 *
 *
 * What i wish to try :
 *
 * I think I should understand how to read output of head request and according to the status ,
 * I shud make the updates.
 *
 * And try to use debugger than using console logs.
 *
 *
 * Good bye.!
 *
 */
