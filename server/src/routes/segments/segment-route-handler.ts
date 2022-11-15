import { Request, Response } from "express";
import { handleResponseError } from "../route-handlers/route-error-handler";
import { Collection, ObjectId } from "mongodb";
import {
  ISegment,
  ISegmentGenderData,
  ISegmentMetaData,
} from "../../common/types/db-models/segment";
import { getDbWrapper } from "../../common/db/mongo-wrapper";
import { IPaginatedData } from '../../common/types/mongo-interfaces';

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 10;

export async function segmentList(req: Request, res: Response): Promise<void> {
  try {
    const limit = +req.query.limit || DEFAULT_LIMIT;

    if (limit > MAX_LIMIT) {
      res.status(400).send('Too many segments requested');
    }

    const db = getDbWrapper();

    const { data, totalCount }: IPaginatedData<ISegment> =
      await db.getAll<ISegment>('segments', {
        projection: { _id: 1, name: 1 },
        limit,
      });

    const finalData: Partial<ISegmentMetaData>[] = await Promise.all(
      data.map(async (segment) => {
        // the users collection is too huge and aggregations doesn't work well, count function works much faster
        const userCount =
          await db.count('users', { segment_ids: segment._id });

        return { ...segment, userCount };
      }),
    );


    // todo TASK 1
    // write this function to return { data: ISegmentMetaData[]; totalCount: number };
    // where data is an array of ISegmentMetaData, and totalCount is the # of total segments

    // the "users" collection
    // const userCollection: Collection = await (await getDbWrapper()).getCollection('users');
    // has a "many to one" relationship to the segment collection, check IUser interface or query the raw data.
    // res.json({ success: true, data: ISegmentMetaData[], totalCount });

    res.json({ success: true, totalCount, data: finalData });
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
    ).getCollection("segments");
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
    const segmentId = new ObjectId(req.params.id);
    const db = getDbWrapper();

    const userCounts = await db.aggregate('users', [
      {
        $match: { segment_ids: segmentId },
      },
      {
        $group : {
          _id: "$gender",
          userCount: { $sum: 1 },
        },
      },
    ]);

    const totalCount = userCounts.reduce(
      (acc, { userCount }) => acc += userCount,
      0,
    );

    /***** This approach as slow as the aggregation approach above *****/ 

    // const userCounts = await Promise.all(
    //   Object.entries(Gender).map(async ([key, value]) => {
    //     const userCount = await db.count('users', {
    //       segment_ids: segmentId,
    //       gender: value
    //     });

    //     totalCount += userCount;

    //     return { _id: key, userCount };
    //   })
    // );


    /***** Stream approach is also quite slow *****/

    // const cursor = (await db.getCollection('users')).find({
    //   segment_ids: segmentId,
    // }, { projection: { gender: 1 }});

    // const results = {
    //   [Gender.Female]: 0,
    //   [Gender.Male]: 0,
    //   [Gender.Other]: 0,
    // };

    // const stream = cursor.stream();

    // stream.on('data', function(doc) {
    //   results[doc.gender]++;
    // });
    // stream.on('end', function() {
    //   res.json({ success: true, data: results });
    // });

    const finalData: ISegmentGenderData[] = userCounts.map(countInfo => ({
      ...countInfo,
      userPercentage: (countInfo.userCount / (totalCount / 100)).toFixed(2),
    }));

    // todo TASK 2
    // write this function to return
    // data = [ { _id: "Male", userCount: x1, userPercentage: y1 }, { _id: "Female", userCount: x2, userPercentage: y2} ]

    // the "users" collection
    // const userCollection: Collection = await (await getDbWrapper()).getCollection('users');
    // has a "many to one" relationship to the segment collection, check IUser interface or query the raw data.
    // res.json({ success: true, data: ISegmentGenderData[] });

    res.json({ success: true, data: finalData });
  } catch (error) {
    handleResponseError(
      `Segment gender data error: ${error.message}`,
      error.message,
      res
    );
  }
}
