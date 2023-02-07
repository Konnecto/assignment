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
          $sort: {
            userCount: -1,
          },
        },
        {
          $group: {
            _id: null,
            userCount: { $sum: '$userCount' },
            avgIncome: { $avg: '$avgIncome' },
            topGender: { $first: '$_id' },
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
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 5;
    const skip = (page - 1) * limit;


    const [segmentCollection, userCollection] = await Promise.all([
      (await getDbWrapper()).getCollection('segments'),
      (await getDbWrapper()).getCollection('users'),
    ]);

// I'm using a loop that queries the DB every single time for a different segment 
// instead of using one big query that does both operations.
// The reason for that is in the performance results - I tested both options,
// and I saw that using a loop + single query is faster than one big query.
//
// I've added the big query to the bottom of the file in case you to look 
// (I obviosly wouldn't add the comments to a produciton code).

    const segmentsArray = await segmentCollection.find().skip(skip).limit(limit).toArray();

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

const _getSegmentGenderDataFromDB = async (
  segmentId: string,
  userCollection: Collection
): Promise<ISegmentGenderData[]> => {
  const partialgroupGenderArray = await userCollection
    .aggregate([
      {
        $match: { segment_ids: new ObjectId(segmentId) },
      },
      {
        $group: {
          _id: '$gender',
          userCount: { $sum: 1 },
        },
      },
    ])
    .toArray();

  const totalUserCount = partialgroupGenderArray.reduce(
    (accumulator, groupGenderItem) => accumulator + groupGenderItem.userCount,
    0
  );

  const groupSegmentGenderDataArray: ISegmentGenderData[] =
    partialgroupGenderArray.map((groupGenderItem) => {
      return {
        ...groupGenderItem,
        userPercentage: (groupGenderItem.userCount / totalUserCount) * 100,
      };
    });

  return groupSegmentGenderDataArray;
};

export async function getSegmentGenderData(
  req: Request,
  res: Response
): Promise<void> {
  try {
    const segmentId = req.params.id;

    const userCollection: Collection = await (
      await getDbWrapper()
    ).getCollection('users');

    const groupSegmentGenderDataArray = await _getSegmentGenderDataFromDB(
      segmentId,
      userCollection
    );

    res.json({ success: true, data: groupSegmentGenderDataArray });
  } catch (error) {
    handleResponseError(
      `Segment gender data error: ${error.message}`,
      error.message,
      res
    );
  }
}


    //                       BIG QUERY
    // GETTING segmentsMetadataArray FROM DB IN A SINGLE INTERACTION
    // ############################################
    // const segmentsMetadataArray = await segmentCollection.aggregate([
    //   { $limit: 1 },
    //   {
    //     $lookup: {
    //       from: "users",
    //       let: { segmentId: "$_id" },
    //       pipeline: [
    //         { $match: { $expr: { $in: ["$$segmentId", "$segment_ids" ] } } },
    //         {
    //           $group: {
    //             _id: "$gender",
    //             userCount: { $sum: 1 },
    //             avgIncome: { $avg: "$income_level" }
    //           }
    //         },
    //         {
    //           $sort: { userCount: -1 }
    //         },
    //         {
    //           $group: {
    //             _id: null,
    //             userCount: { $sum: "$userCount" },
    //             avgIncome: { $avg: "$avgIncome" },
    //             topGender: { $first: "$_id" }
    //           }
    //         }
    //       ],
    //       as: "segmentResults"
    //     }
    //   },
    //   {
    //     $unwind: '$segmentResults',
    //   },
    //   {
    //     $replaceRoot: {
    //       newRoot: {
    //         $mergeObjects: [
    //           '$segmentResults',
    //           {
    //             name: '$name',
    //             _id: '$_id',
    //           },
    //         ],
    //       },
    //     },
    //   },
    // ]).toArray();
    // ############################################