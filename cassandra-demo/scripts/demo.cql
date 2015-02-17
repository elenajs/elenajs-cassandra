drop keyspace cassdemo;
CREATE KEYSPACE cassdemo WITH REPLICATION = { 'class' : 'SimpleStrategy', 'replication_factor' : 1 };
create table cassdemo.sample3 (
  id int,
  insertion_time timeuuid,
  data text,
  PRIMARY KEY(id, insertion_time))
  WITH CLUSTERING ORDER BY (insertion_time ASC);

insert into cassdemo.sample3(id, insertion_time, data) values(1, now(), 'val1');
insert into cassdemo.sample3(id, insertion_time, data) values(1, now(), 'val2');
insert into cassdemo.sample3(id, insertion_time, data) values(1, now(), 'val3');
insert into cassdemo.sample3(id, insertion_time, data) values(1, now(), 'val4');
insert into cassdemo.sample3(id, insertion_time, data) values(1, now(), 'val5');
insert into cassdemo.sample3(id, insertion_time, data) values(1, now(), 'val6');
insert into cassdemo.sample3(id, insertion_time, data) values(1, now(), 'val7');
