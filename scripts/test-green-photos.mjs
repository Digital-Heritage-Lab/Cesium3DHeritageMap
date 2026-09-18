import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plainText, photoFromCommons } from './update-green-photos.mjs';

const image = {
  imageinfo: [{
    mime: 'image/jpeg',
    thumburl: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/park.jpg/720px-park.jpg',
    descriptionurl: 'https://commons.wikimedia.org/wiki/File:park.jpg',
    extmetadata: {
      Artist: { value: '<a href="//commons.wikimedia.org/wiki/User:Example">Example</a> &amp; Co.' },
      LicenseShortName: { value: 'CC BY-SA 4.0' },
      LicenseUrl: { value: 'https://creativecommons.org/licenses/by-sa/4.0' },
      AttributionRequired: { value: 'true' },
    },
  }],
};

test('Commons metadata yields a credited, licensed thumbnail', () => {
  assert.equal(plainText('<b>Foto</b> &amp; Archiv'), 'Foto & Archiv');
  const photo = photoFromCommons(image);
  assert.equal(photo.artist, 'Example & Co.');
  assert.equal(photo.license, 'CC BY-SA 4.0');
  assert.equal(photo.extension, 'jpg');
});

test('Unlicensed or uncredited images are not selected', () => {
  assert.equal(photoFromCommons({ imageinfo: [{ ...image.imageinfo[0], extmetadata: {} }] }), null);
  assert.equal(photoFromCommons({ imageinfo: [{ ...image.imageinfo[0], extmetadata: {
    ...image.imageinfo[0].extmetadata, Artist: { value: '' },
  } }] }), null);
  assert.equal(photoFromCommons({ imageinfo: [{ ...image.imageinfo[0], thumburl: 'https://example.com/park.jpg' }] }), null);
});
