import Outcall "http-outcalls/outcall";

actor Main {

  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  public func fetchMFData(schemeCode : Text) : async Text {
    let url = "https://api.mfapi.in/mf/" # schemeCode;
    await Outcall.httpGetRequest(url, [], transform);
  };

  public func searchMutualFunds(q : Text) : async Text {
    let url = "https://api.mfapi.in/mf/search?q=" # q;
    await Outcall.httpGetRequest(url, [], transform);
  };

  public func fetchStockPrice(symbol : Text) : async Text {
    let yahooUrl = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" # symbol;
    let proxyUrl = "https://api.allorigins.win/get?url=" # yahooUrl;
    await Outcall.httpGetRequest(proxyUrl, [], transform);
  };

};
