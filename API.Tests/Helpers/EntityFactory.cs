﻿using System.Collections.Generic;
using System.Linq;
using API.Entities;
using API.Entities.Enums;
using API.Entities.Metadata;

namespace API.Tests.Helpers
{
    /// <summary>
    /// Used to help quickly create DB entities for Unit Testing
    /// </summary>
    public static class EntityFactory
    {
        public static Series CreateSeries(string name)
        {
            return new Series()
            {
                Name = name,
                SortName = name,
                LocalizedName = name,
                NormalizedName = API.Parser.Parser.Normalize(name),
                Volumes = new List<Volume>(),
                Metadata = new SeriesMetadata()
            };
        }

        public static Volume CreateVolume(string volumeNumber, List<Chapter> chapters = null)
        {
            var chaps = chapters ?? new List<Chapter>();
            var pages = chaps.Count > 0 ? chaps.Max(c => c.Pages) : 0;
            return new Volume()
            {
                Name = volumeNumber,
                Number = (int) API.Parser.Parser.MinimumNumberFromRange(volumeNumber),
                Pages = pages,
                Chapters = chaps
            };
        }

        public static Chapter CreateChapter(string range, bool isSpecial, List<MangaFile> files = null, int pageCount = 0)
        {
            return new Chapter()
            {
                IsSpecial = isSpecial,
                Range = range,
                Number = API.Parser.Parser.MinimumNumberFromRange(range) + string.Empty,
                Files = files ?? new List<MangaFile>(),
                Pages = pageCount,

            };
        }

        public static MangaFile CreateMangaFile(string filename, MangaFormat format, int pages)
        {
            return new MangaFile()
            {
                FilePath = filename,
                Format = format,
                Pages = pages
            };
        }

        public static SeriesMetadata CreateSeriesMetadata(ICollection<CollectionTag> collectionTags)
        {
            return new SeriesMetadata()
            {
                CollectionTags = collectionTags
            };
        }

        public static CollectionTag CreateCollectionTag(int id, string title, string summary, bool promoted)
        {
            return new CollectionTag()
            {
                Id = id,
                NormalizedTitle = API.Parser.Parser.Normalize(title).ToUpper(),
                Title = title,
                Summary = summary,
                Promoted = promoted
            };
        }
    }
}
