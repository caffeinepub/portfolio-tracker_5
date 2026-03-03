import Outcall "http-outcalls/outcall";
import List "mo:core/List";
import Text "mo:core/Text";

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

  // Fetch stock/ETF price from Yahoo Finance
  public func fetchStockPrice(symbol : Text) : async Text {
    let yahooUrl = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=" # symbol;

    let headers = List.fromArray<Outcall.Header>([
      {
        name = "User-Agent";
        value = "Mozilla/5.0";
      },
      {
        name = "Accept";
        value = "application/json";
      },
    ]);

    // Try primary URL (query1)
    let primaryResponse = await Outcall.httpGetRequest(yahooUrl, headers.toArray(), transform);

    // Check for empty or error response, then try fallback URL (query2)
    if (primaryResponse.isEmpty()) {
      let fallbackUrl = "https://query2.finance.yahoo.com/v7/finance/quote?symbols=" # symbol;
      await Outcall.httpGetRequest(fallbackUrl, headers.toArray(), transform);
    } else {
      primaryResponse;
    };
  };

  // Fetch NPS scheme NAV from npsnav.in
  public func fetchNPSNav(pfmId : Text) : async Text {
    let url = "https://npsnav.in/api/" # pfmId;
    await Outcall.httpGetRequest(url, [], transform);
  };
};
