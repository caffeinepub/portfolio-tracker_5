import Outcall "http-outcalls/outcall";
import List "mo:core/List";

actor {
  public query func transform(input : Outcall.TransformationInput) : async Outcall.TransformationOutput {
    Outcall.transform(input);
  };

  // Fetch mutual fund data from mfapi.in
  public func fetchMFData(schemeCode : Text) : async Text {
    let url = "https://api.mfapi.in/mf/" # schemeCode;
    await Outcall.httpGetRequest(url, [], transform);
  };

  // Search mutual funds on mfapi.in
  public func searchMutualFunds(q : Text) : async Text {
    let url = "https://api.mfapi.in/mf/search?q=" # q;
    await Outcall.httpGetRequest(url, [], transform);
  };

  // Fetch Stock/ETF price from Yahoo Finance
  public func fetchStockPrice(symbol : Text) : async Text {
    let url = "https://query1.finance.yahoo.com/v8/finance/chart/" # symbol # "?interval=1d&range=1d";
    let headers = List.fromArray<{ name : Text; value : Text }>([
      { name = "User-Agent"; value = "Mozilla/5.0 (compatible)" },
      { name = "Accept"; value = "application/json" },
    ]);
    await Outcall.httpGetRequest(url, headers.toArray(), transform);
  };

  // Fetch npsnav.in data
  public func fetchNPSNav(pfmId : Text) : async Text {
    let url = "https://npsnav.in/api/" # pfmId;
    await Outcall.httpGetRequest(url, [], transform);
  };
};
