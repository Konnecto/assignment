import { Request, Response } from 'express';
import { handleResponseError } from '../route-handlers/route-error-handler';
import { Collection, ObjectId } from 'mongodb';
import {
  ISegment,
  ISegmentGenderData,
  ISegmentMetaData,
} from '../../common/types/db-models/segment';
import { getDbWrapper } from '../../common/db/mongo-wrapper';

const _getSingleSegmentMetadataFromDB = async (
  segmentItem: ISegment,
  userCollection: Collection
): Promise<ISegmentMetaData> => {
  return (
    await userCollection
      .aggregate([
        {
          $match: { segment_ids: segmentItem._id },
        },
        {
          $group: {
            _id: '$gender',
            userCount: { $sum: 1 },
            avgIncome: { $avg: '$income_level' },
          },
        },
        {
          $group: {
            _id: null,
            userCount: { $sum: '$userCount' },
            avgIncome: { $avg: '$avgIncome' },
            topGender: { $max: '$_id' },
          },
        },
        {
          $addFields: {
            name: segmentItem.name,
            _id: segmentItem._id,
          },
        },
      ])
      .toArray()
  )[0];
};

export async function segmentList(req: Request, res: Response): Promise<void> {
  try {
    const [segmentCollection, userCollection] = await Promise.all([
      (await getDbWrapper()).getCollection('segments'),
      (await getDbWrapper()).getCollection('users'),
    ]);

    // I purposely added a limit to the segmentsArray in order to see a result in a normal timeframe,
    // otherwise the queries will take unreasonable amount of time.
    const segmentsArray = await segmentCollection.find().limit(5).toArray();

    const segmentsMetadataArray = await Promise.all(
      segmentsArray.map(
        async (segmentItem) =>
          await _getSingleSegmentMetadataFromDB(segmentItem, userCollection)
      )
    );

    res.json({
      success: true,
      data: segmentsMetadataArray,
      totalCount: segmentsMetadataArray.length,
    });
  } catch (error) {
    handleResponseError(
      `Get Segment List Error: ${error.message}`,
      error.message,
      res
    );
  }
}

export async function getSegmentById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const segmentCollection: Collection = await (
      await getDbWrapper()
    ).getCollection('segments');
    const segment: ISegment = await segmentCollection.findOne({
      _id: new ObjectId(req.params.id as string),
    });
    if (!segment) {
      return handleResponseError(
        `Error getSegmentById`,
        `Segment with id ${req.params.id} not found.`,
        res
      );
    }
    res.json({ success: true, data: segment });
  } catch (error) {
    handleResponseError(
      `Get Segment by id error: ${error.message}`,
      error.message,
      res
    );
  }
}

export async function updateSegmentById(
  req: Request,
  res: Response
): Promise<void> {
  try {
    // res.json({ success: true });
  } catch (error) {
    handleResponseError(
      `Update Segment by id error: ${error.message}`,
      error.message,
      res
    );
  }
}

export async function getSegmentGenderData(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const segmentCollection: Collection = await (
      await getDbWrapper()
    ).getCollection('segments');

    // todo TASK 2
    // write this function to return
    // data = [ { _id: "Male", userCount: x1, userPercentage: y1 }, { _id: "Female", userCount: x2, userPercentage: y2} ]

    // the "users" collection
    // const userCollection: Collection = await (await getDbWrapper()).getCollection('users');
    // has a "many to many" relationship to the segment collection, check IUser interface or query the raw data.
    // res.json({ success: true, data: ISegmentGenderData[] });

    res.json({ success: true });
  } catch (error) {
    handleResponseError(
      `Segment gender data error: ${error.message}`,
      error.message,
      res
    );
  }
}
