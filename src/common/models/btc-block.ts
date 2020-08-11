import { ForkDetectionData } from "./fork-detection-data";
import { checkTag } from "../utils/helper";

export class BtcBlock {
  public btcInfo: BtcHeaderInfo;
  public rskTag: ForkDetectionData;

  constructor(_height: number, _hash: string, _rskTag: string, _guessedMiner: string) {
    this.btcInfo = new BtcHeaderInfo(_height, _hash, _guessedMiner);

    if (_rskTag && !checkTag(_rskTag)){
        throw new Error("RSK tag bad form comming from btc at height: " + _height + " with hash: " + _hash)
    }
    
    if(_rskTag){
      this.rskTag = new ForkDetectionData(_rskTag);
    }
  };

  public hasRskTag(): boolean{
    return this.rskTag != null;
  }
}

export class BtcHeaderInfo {
  public height: number;
  public hash: string;
  public guessedMiner: string;

  constructor(_height: number, _hash: string, _guessedMiner: string) {
    this.height = _height;
    this.hash = _hash;
    this.guessedMiner = _guessedMiner;
  }

  public static fromObject(btcInfo: any): BtcHeaderInfo {
    if (btcInfo != null) {
      return new BtcHeaderInfo(btcInfo.height, btcInfo.hash, btcInfo.guessedMiner);
    } else {
      return null;
    }
  }
}
