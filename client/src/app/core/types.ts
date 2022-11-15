export interface IAdmin {
  token?: string;
  name: string;
}

export interface ISegment {
  _id: string;
  name: string;
}

export interface ISegmentMetaData extends ISegment {
  // AS I CAN SEE only this field is presented in the UI metadata interface that's why I only added userCount field to the API response
  userCount: number;
}

export interface ISegmentGenderData {
  _id: Gender;
  userCount: number;
  userPercentage: number;
}

export enum Gender {
  Female = "Female",
  Male = "Male",
}
