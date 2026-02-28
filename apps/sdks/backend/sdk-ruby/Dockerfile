FROM ruby:3.3-slim
WORKDIR /workspace
COPY Gemfile ./
RUN bundle install
COPY lib ./lib
COPY test ./test
CMD ["ruby", "-Ilib", "test/client_test.rb"]
