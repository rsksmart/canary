import { checkTag, toHex } from "../utils/helper";

export class ForkDetectionData {
    public prefixHash: string;
    public CPV: string;
    public NU: number;
    public BN: number;

    constructor(forkDetectionData: string | any) {
        if (typeof forkDetectionData != "string") {
            //Is an object
            this.prefixHash = forkDetectionData.prefixHash;
            this.CPV = forkDetectionData.CPV;
            this.NU = forkDetectionData.NU;
            this.BN = forkDetectionData.BN;
            return;
        }

        let tag = checkTag(forkDetectionData);

        if (tag != null) {
            tag = tag.substring(2);
            this.prefixHash = tag.substring(0, 40);
            this.CPV = tag.substring(40, 54);
            this.NU = parseInt(tag.substring(54, 56), 16);
            this.BN = parseInt(tag.substring(56, 64), 16);
        } else {
            return null;
        }
    }

    public overlapCPV(cpvToCheck: ForkDetectionData, countCPVtoMatch: number) {
        var trimCpvs: any = this.getTrimCPVOverlaps(cpvToCheck);

        if(countCPVtoMatch > 7){
            return false;
        }

        if (trimCpvs.cpv === trimCpvs.cpvToCompare) {
            var matchLength = trimCpvs.cpv.length / 2;
            return (7 - matchLength) <= countCPVtoMatch;
        }

        return false;
    }

    public toString(): string {
        return '0x' + this.prefixHash + this.CPV + toHex(this.NU, 1) + toHex(this.BN, 4);
    }

    public equals(other: ForkDetectionData): boolean {
        return this.prefixHash === other.prefixHash &&
            this.CPV === other.CPV &&
            this.NU === other.NU &&
            this.BN === other.BN;
    }

    public getTrimCPVOverlaps(forkDetectionDataToCompare: ForkDetectionData): any {
        let height = Math.floor((this.BN - 1) / 64);
        let heightToCompare = Math.floor((forkDetectionDataToCompare.BN - 1) / 64);
        let difference = Math.abs(height - heightToCompare);
        let cpvs: any = {};

        if (difference > 7) {
            cpvs.cpv = '';
            cpvs.cpvToCompare = '';
            return cpvs;
        }

        let cpv;
        let cpvToCompare;

        if (height < heightToCompare) {
            cpv = this.CPV.slice(0, this.CPV.length - 2 * difference);
            cpvToCompare = forkDetectionDataToCompare.CPV.slice(2 * difference);
        } else {
            cpv = forkDetectionDataToCompare.CPV.slice(0, this.CPV.length - 2 * difference);
            cpvToCompare = this.CPV.slice(2 * difference);
        }

        cpvs.cpv = cpv;
        cpvs.cpvToCompare = cpvToCompare;

        return cpvs;
    }

    public getNumberOfBytesThatCPVMatch(forkDetectionDataToCompare: ForkDetectionData): number {
        const trimCpvs: any = this.getTrimCPVOverlaps(forkDetectionDataToCompare);
        
        for (let i = 0; i < trimCpvs.cpv.length; i = i + 2) {
            var cpvSliced = trimCpvs.cpv.slice(i);
            if (cpvSliced === trimCpvs.cpvToCompare.slice(i)) {
                return cpvSliced.length / 2;
            }
        }

        return 0;
    }
}